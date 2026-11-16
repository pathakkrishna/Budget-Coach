
import os
import asyncio

from dotenv import load_dotenv
from agent_framework import Agent
from agent_framework.openai import OpenAIChatCompletionClient

# Load environment variables
load_dotenv()

# Check API key
api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env")

# Configure Groq client
client = OpenAIChatCompletionClient(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1",
    model=model
)

# Create a simple test agent
agent = Agent(
    client=client,
    name="ConnectionTestAgent",
    instructions="You are a helpful assistant. Keep your answers brief."
)

async def main():

    print("Testing Microsoft Agent Framework + Groq...")

    response = await agent.run(
        "Explain the 50/30/20 budgeting rule in three short sentences."
    )

    print("\nMODEL RESPONSE:")
    print(response)

    print("\nConnection successful!")

if __name__ == "__main__":
    asyncio.run(main())
