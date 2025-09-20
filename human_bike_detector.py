#!/usr/bin/env python3
"""
Efficient Real-time Object Detection using YOLOv8
Supports webcams, video files, or network streams.
"""

import cv2
import time
import argparse
from ultralytics import YOLO
import random
# PyTorch 1.13.1 is compatible with YOLO models


class ObjectDetector:
    def __init__(self, model_path='yolov8n.pt', confidence_threshold=0.5, target_classes=[0, 1]):
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.target_classes = target_classes

        # COCO class names
        self.class_names = [
            "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
            "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat","dog",
            "horse","sheep","cow","elephant","bear","zebra","giraffe","backpack","umbrella",
            "handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite",
            "baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle",
            "wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange",
            "broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant",
            "bed","dining table","toilet","tv","laptop","mouse","remote","keyboard","cell phone",
            "microwave","oven","toaster","sink","refrigerator","book","clock","vase","scissors",
            "teddy bear","hair drier","toothbrush"
        ]

        # Random color per class
        self.colors = {cls: (random.randint(0,255), random.randint(0,255), random.randint(0,255))
                       for cls in self.target_classes}

    def draw_detections(self, frame, results):
        if results and results[0].boxes is not None:
            for box in results[0].boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                if conf < self.confidence_threshold or cls not in self.target_classes:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                label = f"{self.class_names[cls]}: {conf:.2f}"
                color = self.colors.get(cls, (0,255,255))

                # Draw box
                cv2.rectangle(frame, (x1,y1), (x2,y2), color, 2)

                # Draw label
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                cv2.rectangle(frame, (x1, y1 - label_size[1] - 10),
                              (x1 + label_size[0], y1), color, -1)
                cv2.putText(frame, label, (x1, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
        return frame

    def detect(self, source=0, display_fps=True):
        """
        Detect objects in real-time from any video source:
        - source: int (webcam), str (video file path or stream URL)
        """
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"❌ Error: Could not open source {source}")
            return

        fps_counter, start_time = 0, time.time()

        print(f"🎯 Detecting classes: {[self.class_names[c] for c in self.target_classes]}")
        print("⌨️  Controls: 'q' to quit, 's' to save frame")

        try:
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                # YOLO detection
                results = self.model(frame, classes=self.target_classes, verbose=False)

                # Draw results
                frame = self.draw_detections(frame, results)

                # Display FPS
                if display_fps:
                    fps_counter += 1
                    if fps_counter % 30 == 0:
                        elapsed = time.time() - start_time
                        fps = fps_counter / elapsed
                        cv2.putText(frame, f"FPS: {fps:.1f}", (10,30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

                # Show frame
                cv2.imshow("YOLOv8 Detection", frame)

                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    filename = f"detection_{int(time.time())}.jpg"
                    cv2.imwrite(filename, frame)
                    print(f"✅ Saved {filename}")

        except KeyboardInterrupt:
            print("\n🛑 Stopped by user")

        finally:
            cap.release()
            cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="YOLOv8 Real-time Detection")
    parser.add_argument('--source', type=str, default='0',
                        help="Video source: webcam index, file path, or stream URL")
    parser.add_argument('--model', type=str, default='yolov8n.pt')
    parser.add_argument('--confidence', type=float, default=0.5)
    parser.add_argument('--classes', type=int, nargs='+', default=[0,1])
    parser.add_argument('--no-fps', action='store_true')

    args = parser.parse_args()

    # Convert numeric source to int if possible
    try:
        source = int(args.source)
    except ValueError:
        source = args.source

    detector = ObjectDetector(
        model_path=args.model,
        confidence_threshold=args.confidence,
        target_classes=args.classes
    )
    detector.detect(source=source, display_fps=not args.no_fps)


if __name__ == "__main__":
    main()
