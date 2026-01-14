import os
from langchain_openai import ChatOpenAI

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
                model="gpt-4-turbo-preview", 
                temperature=0.3
            )
            print("🧠 QueryRefiner: OpenAI GPT Connected.")
        except Exception as e:
            self.llm = None
            print(f"⚠️ QueryRefiner: OpenAI Error: {e}")

    def refine(self, topic):
        """
        Input: 'music schools'
        Output: 'Christian gospel music schools and worship training centers'
        """
        # 1. Fallback (Rule-Based) - Simple & Effective
        # Ensure we don't repeat "Christian" if user already typed it
        base = topic.strip()
        if "christian" not in base.lower() and "church" not in base.lower() and "jesus" not in base.lower():
            refined_fallback = f"Christian {base}"
        else:
            refined_fallback = base
            
        # 2. AI Refinement
        if self.llm:
            try:
                # Optimized Prompt
                prompt = f"""
                Act as a Helpful Christian Search Assistant.
                Rewrite the user's search topic to specifically target Christian, Faith-Based, and Church-related resources.
                Ensure the query is broad enough to catch 'Gospel', 'Worship', 'Ministry', and 'Theology' aspects.
                Do NOT add location unless specified. 
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
        print(f"🔧 Fallback Refined: '{topic}' -> '{refined_fallback}'")
        return refined_fallback
