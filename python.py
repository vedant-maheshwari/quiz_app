import streamlit as st
import google.generativeai as genai
import os
import json

# Configure your API key (replace with your actual API key)
genai.configure(api_key="AIzaSyA8uiAbK_rgUGi90zKKN7XhWlYaW3vTSBk")

# Model to use (Gemini Pro)
model = genai.GenerativeModel('gemini-2.0-flash-thinking-exp-1219')

def generate_quiz_questions(topic, num_questions=5):
    """Generates quiz questions based on a topic."""
    prompt = f"""
        Generate {num_questions} quiz questions about {topic}.
        Each question should be multiple choice with 4 options (A, B, C, D) and specify the correct answer.
        Format the output as a JSON array where each item is a dictionary with:
        "question", "options", and "correct_answer".
        Example output:
        ```json
        [
          {{
            "question": "What is the capital of France?",
            "options": ["A) London", "B) Paris", "C) Berlin", "D) Rome"],
            "correct_answer": "B"
          }},
          {{
            "question": "What is 2+2?",
            "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
            "correct_answer": "B"
          }}
        ]
        ```
    """
    try:
        response = model.generate_content(prompt)
        
        if not response.text:  
            st.error("Error: Empty response from the model.")
            return None
        
        raw_text = response.text.strip()
        print("🔍 Raw API Response:", raw_text)  # Debugging: Print response

        # Extract JSON block if response is wrapped in ```json ... ```
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()

        try:
            quiz_data = json.loads(raw_text)
            return quiz_data
        except json.JSONDecodeError as json_error:
            st.error(f"Error: Invalid JSON response: {json_error}")
            return None

    except Exception as e:
        st.error(f"An error occurred: {e}")
        return None


def display_quiz(quiz_data):
    """Displays the quiz in Streamlit."""
    if quiz_data:
        user_answers = {}  # Store user's answers
        for i, question_data in enumerate(quiz_data):
            st.write(f"**Question {i + 1}:** {question_data['question']}")
            options = question_data['options']
            user_answer = st.radio(f"Select your answer for question {i+1}", options)
            user_answers[i] = user_answer.split(") ")[0] if user_answer else None #extract just A, B, C, or D.

        if st.button("Submit"):
            correct_count = 0
            for i, question_data in enumerate(quiz_data):
                correct_answer = question_data['correct_answer']
                user_answer = user_answers.get(i)
                correct_full_answer = next(opt for opt in question_data['options'] if opt.startswith(correct_answer + ")")) #find the full answer
                if user_answer == correct_answer:
                    correct_count += 1
                    st.success(f"Question {i + 1}: Correct! The answer is {correct_full_answer}")
                else:
                    st.error(f"Question {i + 1}: Incorrect. The correct answer is {correct_full_answer}")
            st.write(f"You scored {correct_count} out of {len(quiz_data)}.")
    else:
        st.write("Failed to generate quiz questions.")

def main():
    st.title("Personalized Quiz Generator")
    topic = st.text_input("Enter the quiz topic:")
    num_questions = st.number_input("Number of Questions", min_value=1, value=5)

    if st.button("Generate Quiz"):
        if topic:
            quiz_data = generate_quiz_questions(topic, num_questions)
            display_quiz(quiz_data)
        else:
            st.warning("Please enter a topic.")

if __name__ == "__main__":
    main()