const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'analyze', description: 'Analyze an image (upload or URL)' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'analyze')) {
      const remaining = Math.ceil(getCooldownRemaining(message.author.id, 'analyze') / 1000);
      return message.reply(`⏳ Please wait ${remaining}s before using this command again.`);
    }
    setCooldown(message.author.id, 'analyze');

    let imageUrl;

    // Check if this is a reply to another message
    if (message.reference) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedTo.attachments.size > 0) {
          const attachment = repliedTo.attachments.first();
          if (attachment.contentType && attachment.contentType.startsWith('image/')) {
            imageUrl = attachment.url;
          }
        }
        // If no attachments in reply, try to get image URLs from message content
        if (!imageUrl && repliedTo.content) {
          const urlMatch = repliedTo.content.match(/https?:\/\/\S+/);
          if (urlMatch) imageUrl = urlMatch[0];
        }
      } catch (err) {
        console.error('[Analyze] Error fetching replied message:', err.message);
      }
    }

    // Check for attached images in current message
    if (!imageUrl && message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
        return message.reply('❌ Please upload an image file or provide an image URL.');
      }
      imageUrl = attachment.url;
    } else if (!imageUrl && args[0]) {
      imageUrl = args[0];
    } else if (!imageUrl) {
      return message.reply('❌ Upload an image, provide a URL, or reply to a message with images. Example: `-analyze https://example.com/image.jpg` (PNG, JPG, GIF, WebP)');
    }

    await message.channel.sendTyping();

    try {
      // Convert Tenor GIF to static image if needed
      if (imageUrl.includes('tenor.com')) {
        imageUrl = imageUrl.replace(/\?.+$/, '') + '?fmt=json';
        const tenorRes = await fetch(imageUrl);
        const tenorData = await tenorRes.json();
        if (tenorData.media?.[0]?.gif?.url) {
          imageUrl = tenorData.media[0].gif.url;
        } else if (tenorData.media?.[0]?.mediumgif?.url) {
          imageUrl = tenorData.media[0].mediumgif.url;
        }
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Analyze this image and describe what you see in detail. Include: objects, colors, composition, mood, and any text visible.`;

      const { buffer, mimeType } = await fetchImageAsBase64(imageUrl);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: buffer } }
              ]
            }]
          })
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `API error: ${res.status}`;
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze image.';

      const embed = new EmbedBuilder()
        .setTitle('🖼️ Image Analysis')
        .setDescription(analysis.slice(0, 3900))
        .setImage(imageUrl)
        .setColor('#00CCFF')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Analyze] Error:', err.message);
      message.reply(`❌ Error: ${err.message}\n\n**Supported formats:** PNG, JPG, GIF, WebP\n**Tip:** Use direct image URLs (not web pages)`);
    }
  }
};

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  
  // Validate and map MIME types
  let mimeType = 'image/jpeg';
  if (contentType.includes('png')) mimeType = 'image/png';
  else if (contentType.includes('gif')) mimeType = 'image/gif';
  else if (contentType.includes('webp')) mimeType = 'image/webp';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) mimeType = 'image/jpeg';

  const buffer = await res.buffer();

  // Check file size (Gemini has limits)
  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error('Image file too large (max 20MB)');
  }

  return {
    buffer: buffer.toString('base64'),
    mimeType
  };
}
