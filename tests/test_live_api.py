import urllib.request
import json
import pymupdf

# 1. Upload sample_doc.pdf
boundary = "----TestBoundary"
with open("sample_doc.pdf", "rb") as f:
    pdf_bytes = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="sample_doc.pdf"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
).encode("utf-8") + pdf_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

upload_req = urllib.request.Request(
    "http://127.0.0.1:8000/api/pdf/upload",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
)
res = urllib.request.urlopen(upload_req)
up = json.loads(res.read().decode())
doc_id = up["document_id"]
print("1. Uploaded document_id:", doc_id)

# 2. Fetch extracted text lines
lines_url = f"http://127.0.0.1:8000/api/pdf/{doc_id}/pages/1/text"
lines = json.loads(urllib.request.urlopen(lines_url).read().decode())
print("2. Extracted lines:", [l["text"] for l in lines])
target = lines[0]  # 'SAMPLE CONTRACT AGREEMENT'

# 3. Export with text_replace
export_payload = {
    "objects": [
        {
            "id": "rep-test-1",
            "page": 1,
            "type": "text_replace",
            "x": target["bbox"][0],
            "y": target["bbox"][1],
            "width": target["bbox"][2] - target["bbox"][0],
            "height": target["bbox"][3] - target["bbox"][1],
            "properties": {
                "orig_bbox": target["bbox"],
                "text": "AMENDED CONTRACT AGREEMENT 2026",
                "font_size": 20,
                "font_family": "helv",
                "color": "#000000",
                "bg_color": "#ffffff",
            },
        }
    ]
}

exp_req = urllib.request.Request(
    f"http://127.0.0.1:8000/api/pdf/{doc_id}/export",
    data=json.dumps(export_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)
exp_res = urllib.request.urlopen(exp_req)
exp_data = json.loads(exp_res.read().decode())
print("3. Exported successfully:", exp_data)

# 4. Download and inspect exported PDF
down_url = f"http://127.0.0.1:8000{exp_data['download_url']}"
down_bytes = urllib.request.urlopen(down_url).read()

doc = pymupdf.open(stream=down_bytes, filetype="pdf")
page1_text = doc[0].get_text()
doc.close()

print("\n--- RESULTING PAGE 1 TEXT ---")
print(page1_text)
assert "SAMPLE CONTRACT AGREEMENT" not in page1_text, "Original text was not removed!"
assert "AMENDED CONTRACT AGREEMENT 2026" in page1_text, "New text was not found!"
print("SUCCESS: Original text was replaced in-place perfectly!")
