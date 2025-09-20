# Real-time Human and Bike Detection with YOLO

This project implements real-time detection of humans and bicycles using YOLOv8 and OpenCV. The system captures video from your webcam and displays bounding boxes around detected people and bikes with confidence scores.

## Features

- **Real-time Detection**: Live video feed from webcam with instant detection
- **Target Classes**: Specifically detects humans (person) and bicycles
- **Confidence Filtering**: Configurable confidence threshold for detections
- **Visual Feedback**: Color-coded bounding boxes and labels
- **Performance Monitoring**: FPS counter and detection count display
- **Frame Saving**: Save current frame with detections by pressing 's'

## Requirements

- Python 3.8 or higher
- Webcam or camera device
- CUDA-compatible GPU (optional, for better performance)

## Installation

1. **Clone or download this repository**
   ```bash
   cd yolo_detection
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download YOLO model** (automatic on first run)
   The script will automatically download the YOLOv8n model on first execution.

## Usage

### Basic Usage
```bash
python human_bike_detector.py
```

### Advanced Usage
```bash
# Use different model
python human_bike_detector.py --model yolov8s.pt

# Adjust confidence threshold
python human_bike_detector.py --confidence 0.7

# Use different camera
python human_bike_detector.py --camera 1

# Disable FPS display
python human_bike_detector.py --no-fps
```

### Command Line Arguments

- `--model`: Path to YOLO model weights (default: yolov8n.pt)
- `--confidence`: Confidence threshold for detections (default: 0.5)
- `--camera`: Camera index (default: 0)
- `--no-fps`: Disable FPS display

### Controls

- **'q'**: Quit the application
- **'s'**: Save current frame with detections

## Model Options

The script supports different YOLO model sizes:

- `yolov8n.pt` - Nano (fastest, least accurate)
- `yolov8s.pt` - Small (balanced)
- `yolov8m.pt` - Medium (more accurate, slower)
- `yolov8l.pt` - Large (very accurate, slow)
- `yolov8x.pt` - Extra Large (most accurate, slowest)

## Performance Tips

1. **For better performance**:
   - Use `yolov8n.pt` for fastest detection
   - Lower the confidence threshold if you want more detections
   - Ensure good lighting conditions

2. **For better accuracy**:
   - Use `yolov8s.pt` or larger models
   - Increase confidence threshold to reduce false positives
   - Ensure the target objects are clearly visible

## Troubleshooting

### Camera Issues
- If camera doesn't work, try different camera indices (0, 1, 2, etc.)
- Ensure no other applications are using the camera
- Check camera permissions on macOS/Linux

### Performance Issues
- If detection is slow, try using `yolov8n.pt` model
- Close other applications to free up system resources
- Consider using GPU acceleration if available

### Installation Issues
- Make sure you have Python 3.8+
- Try installing dependencies one by one if pip install fails
- On macOS, you might need to install Xcode command line tools

## Example Output

The application will display:
- Live video feed with bounding boxes around detected humans and bikes
- Color-coded boxes: Green for humans, Blue for bicycles
- Confidence scores for each detection
- Real-time FPS counter
- Total detection count

## Technical Details

- **Detection Classes**: Person (class 0) and Bicycle (class 1) from COCO dataset
- **Input Resolution**: 640x480 (configurable)
- **Model**: YOLOv8 from Ultralytics
- **Framework**: PyTorch backend
- **Video Processing**: OpenCV

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this project.
