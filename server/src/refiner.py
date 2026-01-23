import os
import sys
from langchain_openai import ChatOpenAI

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass  # Fallback if reconfigure fails

class QueryRefiner:
    """
    Refines user queries to ensure they target:
    1. Christian Context (Faith-based resources)
    2. Specific Sub-topics (Music -> Gospel Music, Worship Training)
    Uses OpenAI GPT models for refinement.
    """

    def __init__(self):
        try:
            self.llm = ChatOpenAI(
                model="gpt-3.5-turbo", 
                temperature=0.3
            )
            print("🧠 QueryRefiner: OpenAI GPT Connected.")
        except Exception as e:
            self.llm = None
            print(f"⚠️ QueryRefiner: OpenAI Error: {e}")

    def refine(self, topic):
        """
        Input: 'music schools'
        Output: 'Best music schools and training programs' (Balanced)
        """
        # 1. Fallback (Rule-Based) - Keep it raw if simple
        base = topic.strip()
        refined_fallback = base
            
        # 2. AI Refinement (More balanced for general internet search)
        if self.llm:
            try:
                # Optimized Balanced Prompt
                prompt = f"""
                Act as a Search Optimization Specialist.
                Refine the user's search topic to be more effective for a web search engine.
                Improve the query to get comprehensive, diverse, and high-quality results from across the entire internet.
                Avoid being overly restrictive or biased unless the original topic clearly specifies a niche.
                Output ONLY the refined query text, no quotes.
                
                Topic: "{topic}"
                Refined:
                """
                response = self.llm.invoke(prompt)
                refined_ai = response.content.strip().replace('"', '').replace("'", "")
                
                print(f"✨ AI Refined: '{topic}' -> '{refined_ai}'")
                return refined_ai
            except Exception as e:
                print(f"⚠️ AI Refinement Failed: {e}")
                return refined_fallback

        # Return fallback if no AI
        return refined_fallback
