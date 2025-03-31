# DesignVision 3D - Image to 3D Model Converter

This application allows you to convert images and drawings to 3D models using Meshy AI. You can either draw directly in the application or import an image, then convert it to a 3D model.

## Features

- Drawing canvas with different tools (pencil, eraser, shapes)
- Image import functionality
- Integration with Meshy AI for 3D model generation
- Real-time 3D model viewer

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- A Meshy AI API key (https://meshy.ai/)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd designvision-3d
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Meshy AI API key:

```
NEXT_PUBLIC_MESHY_API_KEY=your_meshy_api_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Use the drawing tools on the left panel to create your design, or import an image.
2. Click the "Export to 3D" button (upload icon) in the drawing panel.
3. Wait for the 3D model to be generated. You'll see a progress indicator.
4. Once complete, the 3D model will appear in the right panel.
5. Use your mouse to rotate, zoom, and pan the 3D model view.

## Building for Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Technologies Used

- Next.js
- React
- Three.js / React Three Fiber
- Tailwind CSS
- Meshy AI API

## License

This project is licensed under the MIT License - see the LICENSE file for details. 