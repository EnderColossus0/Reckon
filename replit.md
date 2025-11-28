# Outlaw AI Discord Bot

## Overview

This is a Discord bot with AI conversation capabilities, built using Discord.js and the Gemini API. The bot can engage in natural conversations, remember user information across sessions, and operate within configurable channels. It features a prefix-based command system and persistent memory storage using either Replit Database or local file storage as a fallback.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Framework
- **Discord.js v14**: Core Discord integration using the Gateway API
- **Intent-based architecture**: Utilizes specific gateway intents (Guilds, GuildMessages, MessageContent) to minimize bandwidth and improve performance
- **Command pattern**: Prefix-based command system (`-` prefix) with dynamic command loading from the `/commands` directory

### AI Integration
- **Primary AI Provider**: Google Gemini 1.5 Flash model via REST API
- **Secondary AI Provider**: Groq with Llama 3.3 70B Versatile model
- **Context-aware conversations**: System prompt defines bot personality as "Outlaw" - a helpful, friendly assistant that maintains conversation continuity
- **Memory-augmented prompts**: User context and conversation history are injected into prompts to enable personalized responses
- **Automatic fallback**: If primary model fails, automatically tries the secondary model
- **User model selection**: Users can switch between Gemini and Groq with `-setaimodel` command

### Memory System

**Dual-storage strategy** for flexibility across deployment environments:

1. **Primary storage**: Replit Database (cloud-based key-value store)
2. **Fallback storage**: Local JSON files (`config.json`, `ai_memory.json`)

**Storage auto-detection**: The system attempts to load `@replit/database` and falls back to file storage if unavailable.

**Memory structure per user**:
- `profile`: User metadata
- `conversations`: Historical message exchanges
- `knowledge`: Extracted facts about users (parsed from AI responses with `[REMEMBER: ...]` markers)
- `meta`: Additional metadata

**Configuration storage**: Guild-specific settings (e.g., designated AI chat channels) are stored separately from user memory.

### Message Handling Logic

**AI trigger conditions** (evaluated in order):
1. Direct bot mention (@Outlaw)
2. Reply to bot's previous message
3. Message in configured AI channel (if set via `-aichat` command)

**Conversation flow**:
1. Message passes trigger check
2. User memory and conversation history retrieved
3. Context formatted and sent to AI
4. Response parsed for memory markers (`[REMEMBER: ...]`)
5. New facts extracted and stored
6. Response cleaned and sent to user
7. Conversation added to history

### Command Architecture

Commands are modular JavaScript files in `/commands/` directory, each exporting:
- `data`: Object with `name` and `description`
- `execute`: Async function receiving `(message, args, client)`

**Key commands**:
- `aichat`: Configure per-guild AI channel (admin feature)
- `memory`: View/clear personal memory
- `setaimodel`: User preference for AI model (partially implemented)
- `menu`: Dynamic command listing
- `ping`: Latency check

## External Dependencies

### Third-party Services
- **Google Gemini API**: Primary AI conversation engine
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
  - Authentication: API key via environment variable `GEMINI_API_KEY`
  - Model: gemini-1.5-flash

- **Discord API**: Bot platform integration
  - OAuth2 bot token via environment variable (standard Discord bot setup)

### NPM Packages
- `discord.js` (^14.14.0): Discord API wrapper
- `@replit/database` (^3.0.1): Cloud key-value storage
- `dotenv` (^16.3.1): Environment variable management
- `node-fetch` (^2.7.0): HTTP client for AI API calls
- `axios` (^1.5.0): Alternative HTTP client (installed but not actively used in shown code)

### Environment Variables Required
- `GEMINI_API_KEY`: Google Gemini API authentication
- `GROQ_API_KEY`: Groq API authentication
- `TOKEN`: Discord bot token
- `REPLIT_DB_URL`: Auto-injected by Replit environment (optional, enables cloud storage)

### Storage Systems
- **Replit Database**: Managed key-value store (when available)
- **File System**: JSON-based persistence fallback for local development