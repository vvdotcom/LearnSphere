import ollama
import shutil
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Import CORS middleware

from pathlib import Path
from docling.document_converter import DocumentConverter
#from pix2text import Pix2Text

# Initialize FastAPI app
app = FastAPI(
    title="PDF Math Solver API",
    description="Upload a PDF file and provide a prompt to get a solution from Gemma.",
    version="1.0.0",
)

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173", # Default port for Vite/React
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)

# --- Helper Functions from your script ---

def extract_markdown_from_pdf(pdf_path: str) -> str:
    """
    Converts the entire PDF document to a single Markdown string.
    Images are embedded in the markdown.
    """
    try:
        converter = DocumentConverter()
        result = converter.convert(pdf_path)
        # The result contains the markdown representation of the document
        return result.document.export_to_markdown()
    except Exception as e:
        # Raise an HTTPException to be caught by FastAPI for a proper client response
        raise HTTPException(status_code=500, detail=f"Error processing PDF with docling: {e}")

# def extract_markdown_from_png(png_path: str) -> str:
#     try:
#         converter = Pix2Text.from_config()
#         result = converter.recognize_text(png_path)
#         return result
#     except Exception as e:
#             # Raise an HTTPException to be caught by FastAPI for a proper client response
#             raise HTTPException(status_code=500, detail=f"Error processing PNG with Pix2Text: {e}")

def generate_text_file(text: str, user_prompt: str, model: str = 'gemma3n:e2b') -> str:
    """
    Uses Ollama and a specified model to solve problems based on the provided text and prompt.
    """
    try:
        # Combine the user's prompt with the extracted text
        full_prompt = f"""
        {user_prompt}

        --- Document Content ---
        {text}
        """
        
        messages = [
            {
                'role': 'user',
                'content': full_prompt,
            }
        ]
        print("running ollama")
        response = ollama.chat(
            model=model,
            messages=messages
        )
        return response['message']['content']
    except Exception as e:
        # Raise an HTTPException for proper error handling in the API
        raise HTTPException(status_code=500, detail=f"Error interacting with Ollama: {e}")

# --- FastAPI Endpoint ---

@app.post("/text-file/")
async def text_file_endpoint(
    prompt: str = Form(...), 
    file: UploadFile = File(...)
):
    """
    Endpoint to solve math problems from an uploaded PDF file.

    - **prompt**: The prompt to guide the model.
    - **file**: The PDF file containing the math problems.
    """
    # Create a temporary directory to store the uploaded file
    temp_dir = Path("temp_uploads")
    print(temp_dir)
    temp_dir.mkdir(exist_ok=True)
    temp_file_path = temp_dir / file.filename
    print(temp_file_path)
    try:
        # Save the uploaded file to the temporary path
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Extract content from the PDF as Markdown
        # if ".pdf" in str(temp_file_path):
        #     extracted_markdown = extract_markdown_from_pdf(str(temp_file_path))
        # else:
        #     extracted_markdown = extract_markdown_from_png(str(temp_file_path))
        
        extracted_markdown = extract_markdown_from_pdf(str(temp_file_path))

        print(extracted_markdown)
        # 2. Get the solution from the model
        solution = generate_text_file(extracted_markdown, prompt)
        print(solution)
        return {"solution": solution}

    finally:
        # Clean up: remove the temporary file and directory
        if temp_file_path.exists():
            temp_file_path.unlink()
        if temp_dir.exists() and not any(temp_dir.iterdir()):
            temp_dir.rmdir()

@app.post("/text/")
async def text_endpoint(
    prompt: str = Form(...), 
):
    """
    Endpoint to solve math problems from an uploaded PDF file.

    - **prompt**: The prompt to guide the model.
    - **file**: The PDF file containing the math problems.
    """
    # Create a temporary directory to store the uploaded file
   
    messages = [
        {
            'role': 'user',
            'content': prompt,
        }
    ]
    print("running ollama")
    response = ollama.chat(
        model='gemma3n:e2b',
        messages=messages
    )
        
    print(response['message']['content'])
    return {"solution": response['message']['content']}

    

# --- How to Run ---
#
# 1. Make sure Ollama is running and you have pulled the model:
#    ollama pull gemma3n:e2b
#
# 2. Save this code as `main.py`.
#
# 3. Run the FastAPI server using uvicorn:
#    uvicorn main:app --reload
#
# 4. Open your browser to http://127.0.0.1:8000/docs to see the interactive API documentation
#    and test the endpoint.
