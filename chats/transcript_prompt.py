#!/usr/bin/env python3

import requests
import json

exec(open('secretsfile.py', 'r').read())

numcards = 3
json_response = '{"generated_deck_title": "...", "cards":[{"question":"...", "answer":"..."}, ...]}'
transcript = open('transcript_prompt.md', 'r').read()
prompt = f"""Generate a deck of {numcards} flash cards of important facts based on the below YouTube transcript.  Your response should be JSON in the following format: {json_response}
Provide a short title of at most 4 words (with underscores for spaces) in the JSON response which summarizes the transcript content.  You should fill in the ellipses in the provided JSON example.  Do not provide extra formatting like newlines in your questions/answers or wrap the response in a code fence.

{transcript}
"""


# 1. Change the API endpoint to chat completions
response = requests.post(
    "http://copernicus.ece.illinois.edu:8009/v1/chat/completions",
    headers={"Authorization":f"Bearer {password}", "Content-Type":"application/json"},
    json={
        "stream": False,
        "model": "deepseek", # or "llama3.1"
        # 2. Use 'messages' format instead of 'prompt'
        "messages": [
            {
                "role": "system",
                # Crucial system instruction to enforce pure JSON output
                "content": "You are an assistant that only returns valid JSON objects. Your entire response must be a single, valid JSON object, with no other text, commentary, or markdown fences (```json)."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        # 3. Add the response_format parameter for strict JSON output
        "response_format": {
            "type": "json_object"
        }
    }
)

# The response structure changes for chat completions
j = response.json()

# The content is now located in j['choices'][0]['message']['content']
answer = j['choices'][0]['message']['content']

print(answer)