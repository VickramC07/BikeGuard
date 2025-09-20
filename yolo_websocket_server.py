import asyncio
import websockets
import cv2
import base64
from ultralytics import YOLO

# ----- CONFIG -----
# DroidCam URL example, replace with your own if needed
camera_input = input("Enter camera source (0 for default webcam, 1 for external, or URL for stream): ").strip()

try:
    CAMERA_URL = int(camera_input)  # try convert to int (for webcam index)
except ValueError:
    CAMERA_URL = camera_input       # otherwise assume URL

# Or use 0 for local webcam:
# CAMERA_URL = 0

# YOLO model
model = YOLO("yolov8n.pt")

# Class labels (modify if needed)
CLASS_NAMES = {0: "person", 1: "bicycle"}

# ----- CAMERA -----
cap = cv2.VideoCapture(CAMERA_URL)
if not cap.isOpened():
    raise Exception(f"Cannot open camera: {CAMERA_URL}")

# ----- WEBSOCKET HANDLER -----
async def send_frames(websocket, *args):
    while True:
        ret, frame = cap.read()
        if not ret:
            await asyncio.sleep(0.1)
            continue

        # Run YOLO detection (person + bicycle)
        results = model(frame, classes=[0,1], verbose=False)

        # Keep counts for labeling (person 1, person 2, etc.)
        class_counts = {}

        if results and results[0].boxes is not None:
            for box in results[0].boxes:
                cls_idx = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                class_counts[cls_idx] = class_counts.get(cls_idx, 0) + 1
                label = f"{CLASS_NAMES.get(cls_idx, cls_idx)} {class_counts[cls_idx]}: {conf:.2f}"

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)
                cv2.putText(frame, label, (x1, y1-5),
                            cv2.FONT_HERSHEY_SIMPLEX, 3, (255,255,255), 2)

        # Encode frame as JPEG and send
        ret, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        try:
            await websocket.send(jpg_as_text)
        except websockets.ConnectionClosed:
            break

        await asyncio.sleep(0.03)  # ~30 FPS

# ----- MAIN -----
async def main():
    async with websockets.serve(send_frames, "0.0.0.0", 8765):
        print("YOLO WebSocket server started on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
