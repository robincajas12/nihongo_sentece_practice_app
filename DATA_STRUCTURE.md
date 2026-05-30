# JSON Data Structures Documentation

This document describes the structure of the JSON files generated from the Japanese-English sentence pairs.

## 1. Japanese to English Mapping (`jp_to_en.json`)

This file contains a mapping where the keys are the unique Japanese sentence IDs.

### Structure
```json
{
  "JP_SENTENCE_ID": {
    "jp-sentence": "Japanese text",
    "en-translations": [
      "English translation 1",
      "English translation 2",
      ...
    ]
  }
}
```

### Fields
- **`JP_SENTENCE_ID`** (string): The unique identifier for the Japanese sentence.
- **`jp-sentence`** (string): The original Japanese sentence text.
- **`en-translations`** (array of strings): A list of one or more English translations associated with this Japanese sentence.

---

## 2. English to Japanese Mapping (`en_to_jp.json`)

This file contains a mapping where the keys are the unique English sentence IDs.

### Structure
```json
{
  "EN_SENTENCE_ID": {
    "en-sentence": "English text",
    "jp-translations": [
      "Japanese translation 1",
      "Japanese translation 2",
      ...
    ]
  }
}
```

### Fields
- **`EN_SENTENCE_ID`** (string): The unique identifier for the English sentence.
- **`en-sentence`** (string): The original English sentence text.
- **`jp-translations`** (array of strings): A list of one or more Japanese translations associated with this English sentence.

---

## Usage Notes
- The data supports many-to-many relationships (one Japanese sentence can have multiple English translations, and vice versa).
- All files are encoded in UTF-8 to support Japanese characters.
- IDs are treated as strings to ensure compatibility as JSON keys.
