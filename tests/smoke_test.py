import json
import sys
import threading
import time
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import server


def multipart(fields, file_field, file_path):
    boundary = "----codex-smoke-test"
    chunks = []
    for key, value in fields.items():
        chunks.append(
            (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'
                f"{value}\r\n"
            ).encode("utf-8")
        )
    chunks.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'
            "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n"
        ).encode("utf-8")
    )
    chunks.append(file_path.read_bytes())
    chunks.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    return boundary, b"".join(chunks)


def request_json(url, payload=None, headers=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if payload else "GET")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    server.init_db()
    httpd = ThreadingHTTPServer(("127.0.0.1", 8765), server.AppHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.3)

    try:
        boundary, body = multipart(
            {
                "projectName": "테스트 사업",
                "dueDate": "2026-06-30",
                "vendors": "ABC컴퓨터, 홍길동, hong@example.com\n테크유통, 김영희, kim@example.com",
                "memo": "테스트",
            },
            "file",
            ROOT / "samples" / "sample_parts.xlsx",
        )
        create_req = urllib.request.Request(
            "http://127.0.0.1:8765/api/requests",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        with urllib.request.urlopen(create_req) as response:
            created = json.loads(response.read().decode("utf-8"))

        assert created["partCount"] == 4
        assert len(created["vendorLinks"]) == 2

        vendor_token = created["vendorLinks"][0]["url"].split("token=")[1]
        vendor = request_json(f"http://127.0.0.1:8765/api/vendor?token={vendor_token}")
        lines = [{"partId": part["id"], "unitPrice": "1000"} for part in vendor["parts"]]

        submitted = request_json(
            "http://127.0.0.1:8765/api/quote",
            {"token": vendor_token, "lines": lines},
            {"Content-Type": "application/json"},
        )
        assert submitted["ok"] is True

        updated = request_json(
            "http://127.0.0.1:8765/api/quote",
            {"token": vendor_token, "lines": [{"partId": part["id"], "unitPrice": "1200"} for part in vendor["parts"]]},
            {"Content-Type": "application/json"},
        )
        assert updated["ok"] is True

        admin = request_json(f"http://127.0.0.1:8765/api/request?token={created['requestToken']}")
        assert len(admin["quotes"]) == 4
        assert len(admin["notifications"]) == 1

        boundary, body = multipart(
            {
                "projectName": "수기 입력 테스트",
                "dueDate": "2026-06-30",
                "vendors": "수기업체, 담당자, manual@example.com",
                "memo": "수기 입력 테스트",
                "manualParts": json.dumps(
                    [
                        {"name": "노트북", "quantity": 2, "unitPrice": 1500000},
                        {"name": "RAM", "quantity": 4, "unitPrice": 80000},
                    ],
                    ensure_ascii=False,
                ),
            },
            "file",
            ROOT / "samples" / "sample_parts.xlsx",
        )
        manual_body = body.split(b'Content-Disposition: form-data; name="file";')[0]
        manual_body += f"--{boundary}--\r\n".encode("utf-8")
        manual_req = urllib.request.Request(
            "http://127.0.0.1:8765/api/requests",
            data=manual_body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        with urllib.request.urlopen(manual_req) as response:
            manual_created = json.loads(response.read().decode("utf-8"))
        assert manual_created["partCount"] == 2
        print("smoke test passed")
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    main()
