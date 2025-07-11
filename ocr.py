import fitz  # PyMuPDF

doc = fitz.open("Pushkar_s_Resume.pdf")
for page in doc:
    print(page.get_text())
