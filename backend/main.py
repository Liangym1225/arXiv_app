from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from arxiv_bot_bk import _fetch_recent_papers, calculate_relevence
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


NOTION_TOKEN = str(os.environ["NOTION_TOKEN"])
NOTION_DATABASE_ID = str(os.environ["NOTION_DATABASE_ID"])
NOTION_API_URL = str(os.environ["NOTION_API_URL"])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/fetch_recent_papers")
async def get_recent_papers():
    papers = _fetch_recent_papers()
    papers = calculate_relevence(papers)
    papers.sort(key=lambda x: x["relevance"], reverse=True)
    return {"papers": papers}


# データモデル
class Paper(BaseModel):
    title: str
    url: str


@app.post("/add_to_notion")
async def add_to_notion(paper: Paper):
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    # Notion APIに送信するデータ
    data = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": {
            "Title": {
                "title": [
                    {
                        "text": {
                            "content": paper.title,
                        }
                    }
                ]
            },
            "URL": {
                "url": paper.url,
            }
        },
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(NOTION_API_URL, headers=headers, json=data)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return {"message": "Paper added to Notion successfully"}
