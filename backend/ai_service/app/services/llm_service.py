import os 
import json

import httpx
from dotenv import load_dotenv
load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434",
).rstrip("/")

async def generate_text(
        prompt:str,
        system_prompt:str="",
        temprature:float=0.2,
 )->str:
    """Generate text using the configured LLM provider."""
    if LLM_PROVIDER != "ollama":
        raise ValueError(
            f"Unsupported LLM Provider: {LLM_PROVIDER}"
        )

    payload={
        "model":OLLAMA_MODEL,
        "prompt":prompt,
        "system":system_prompt,
        "stream":False,
        "options":{
            "temperature": temprature,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response=await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
    except httpx.ConnectError as exc:
        raise RuntimeError(
            "Ollama took too long to generate a response."
        ) from exc
    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "Ollama took too long to generate a response."
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"Ollama returned HTTP {exc.response.status_code}."
        ) from exc

    data=response.json()
    generate_text=data.get("response","").strip()

    if not generate_text:
        raise RuntimeError("Ollama returned an empty response.")
    return generate_text

async def generate_json(
        prompt:str,
        system_prompt:str="",
        temperature:float=0.1,
    )->dict:
    """Genrate and parse a json object from llm response"""
    raw_response=await generate_text(
        prompt=prompt,
        system_prompt=system_prompt,
        temprature=temperature,
    )

    cleaned_response=raw_response.strip()
    if cleaned_response.startswith("```"):
        lines=cleaned_response.splitlines()

        if lines and lines[0].startswith("```"):
            lines=lines[1:]

        if lines and lines[-1].strip()=="```":
            lines=lines[:-1]

        cleaned_response="\n".join(lines).strip()

    try:
        parsed=json.loads(cleaned_response)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "The AI did not return valid JSON. Please try again."
        ) from exc

    if not isinstance(parsed, dict):
        raise RuntimeError(
            "The AI response must be a JSON object."
        )

    return parsed

