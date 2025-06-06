/**
 * P5Visualizer
 * Handles p5.js visualization for color and depth streams
 */
class P5Visualizer {
  constructor() {
    // p5.js canvas and instance
    this.canvas = null;
    this.p5Instance = null;

    // Visualization state
    this.isActive = false;
    this.frameCount = 0;

    // Constants
    this.AZURE_COLOR_WIDTH = 1280;
    this.AZURE_COLOR_HEIGHT = 720;
    this.AZURE_DEPTH_WIDTH = 640;
    this.AZURE_DEPTH_HEIGHT = 576;
    this.DISPLAY_SCALE = 0.5;
  }

  /**
   * Initialize the visualizer
   * @returns {P5Visualizer} - The initialized visualizer instance
   */
  static initialize() {
    const visualizer = new P5Visualizer();
    visualizer._setupP5();
    return visualizer;
  }

  /**
   * Set up p5.js canvas and sketch
   * @private
   */
  _setupP5() {
    // Define p5.js sketch
    const sketch = (p) => {
      // Store the p5 instance
      this.p5Instance = p;

      p.setup = () => {
        // Create canvas
        this.canvas = p.createCanvas(
          this.AZURE_COLOR_WIDTH * this.DISPLAY_SCALE,
          this.AZURE_COLOR_HEIGHT * this.DISPLAY_SCALE,
        );
        this.canvas.parent('canvas-container');
        p.pixelDensity(1);
        p.background(255);
      };

      p.draw = () => {
        // Draw frame count in corner if stream is active
        if (this.isActive) {
          p.fill(0);
          p.textSize(14);
          p.text(`Frames: ${this.frameCount}`, 10, 20);
        }
      };
    };

    // Create new p5 instance
    new p5(sketch);
  }

  /**
   * Resize canvas
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  resizeCanvas(width, height) {
    if (this.p5Instance) {
      this.p5Instance.resizeCanvas(width, height);
      this.p5Instance.background(255);
    }
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    if (this.p5Instance) {
      this.p5Instance.background(255);
    }
  }

  /**
   * Display color frame
   * @param {Object} frame - Color frame data
   */
  displayColorFrame(frame) {
    if (this.p5Instance && frame.src) {
      this.p5Instance.loadImage(frame.src, (loadedImage) => {
        // Clear canvas
        this.p5Instance.background(255);
        // Draw the image
        this.p5Instance.image(
          loadedImage,
          0,
          0,
          this.p5Instance.width,
          this.p5Instance.height,
        );

        // Update frame count
        this.frameCount++;

        // Set active state
        this.setActive(true);

        if (window.DEBUG && window.DEBUG.RAW_DEPTH) {
          console.log(
            `Color image drawn: ${loadedImage.width}x${loadedImage.height}`,
          );
        }
      });
    } else {
      console.warn(
        'Cannot display color frame: p5 instance or frame source not available',
      );
    }
  }

  /**
   * Display depth frame
   * @param {Object} frame - Depth frame data
   */
  displayDepthFrame(frame) {
    if (this.p5Instance && frame.src) {
      this.p5Instance.loadImage(
        frame.src,
        (loadedImage) => {
          // Clear canvas
          this.p5Instance.background(255);
          // Draw the image
          this.p5Instance.image(
            loadedImage,
            0,
            0,
            this.p5Instance.width,
            this.p5Instance.height,
          );

          // Update frame count
          this.frameCount++;

          // Set active state
          this.setActive(true);

          if (window.DEBUG && window.DEBUG.RAW_DEPTH) {
            console.log(
              `Depth image drawn: ${loadedImage.width}x${loadedImage.height}`,
            );
          }
        },
        (err) => {
          console.error(`Error loading depth image: ${err}`);
        },
      );
    } else {
      console.warn(
        'Cannot display depth frame: p5 instance or frame source not available',
      );
    }
  }

  /**
   * Display skeleton frame
   * @param {Object} frame - Skeleton frame data with bodies array
   */
  displaySkeletonFrame(frame) {
    if (!this.p5Instance) {
      console.error(
        'Cannot display skeleton: p5 instance not available',
      );
      return;
    }

    // Clear canvas
    this.p5Instance.background(255);

    // Draw skeletons if bodies exist
    if (frame.bodies && frame.bodies.length > 0) {
      // Colors for different bodies
      const colors = [
        this.p5Instance.color(0, 180, 180), // Cyan
        this.p5Instance.color(180, 180, 0), // Yellow
        this.p5Instance.color(180, 0, 180), // Magenta
        this.p5Instance.color(180, 0, 0), // Red
        this.p5Instance.color(0, 180, 0), // Green
        this.p5Instance.color(0, 0, 180), // Blue
      ];

      try {
        // Draw each body
        frame.bodies.forEach((body, index) => {
          const color = colors[index % colors.length];
          this._drawSimpleSkeleton(body, color);
        });

        // Update frame count
        this.frameCount++;

        // Set active state
        this.setActive(true);

        // Only log when both DATA and FRAMES debugging are enabled
        if (
          window.DEBUG &&
          window.DEBUG.DATA &&
          window.DEBUG.FRAMES
        ) {
          console.log(
            `Skeleton drawn: ${frame.bodies.length} bodies`,
          );
        }
      } catch (error) {
        console.error('Error drawing skeleton:', error);
      }
    }
  }

  /**
   * Draw a single skeleton
   * @private
   * @param {Object} body - Body data with skeleton information
   * @param {p5.Color} color - Color to use for this skeleton
   */
  _drawSkeleton(body, color) {
    if (!body.skeleton || !body.skeleton.joints) {
      console.warn('No skeleton joints in body data');
      return;
    }

    const p5 = this.p5Instance;
    const joints = body.skeleton.joints;

    if (window.DEBUG && window.DEBUG.DATA) {
      console.group('P5Visualizer: _drawSkeleton');
      console.log('Body ID:', body.id);
      console.log('Joints count:', joints.length);
      console.log('First few joints:', joints.slice(0, 3));
      console.groupEnd();
    }

    // Draw joints
    p5.fill(color);
    p5.noStroke();

    joints.forEach((joint, index) => {
      // Check if we have depthX/depthY coordinates
      if ('depthX' in joint && 'depthY' in joint) {
        // Scale joint coordinates to canvas size
        const x = joint.depthX * p5.width;
        const y = joint.depthY * p5.height;

        // Draw joint
        p5.ellipse(x, y, 10, 10);
      } else if ('cameraX' in joint && 'cameraY' in joint) {
        // If we don't have depthX/depthY but have cameraX/cameraY, use those instead
        // This is a fallback that uses a simple scaling approach

        // Get canvas dimensions
        const canvasWidth = p5.width;
        const canvasHeight = p5.height;

        // Scale camera coordinates to fit canvas
        // Note: This is a very simplified approach and might need adjustment
        const scaleFactor = 0.5; // Adjust this value as needed
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const x = centerX + joint.cameraX * scaleFactor;
        const y = centerY + joint.cameraY * scaleFactor;

        // Draw joint
        p5.ellipse(x, y, 10, 10);

        if (window.DEBUG && window.DEBUG.DATA && index === 0) {
          console.log(
            `Using camera coordinates for joint ${index}: x=${x}, y=${y}`,
          );
        }
      } else {
        if (window.DEBUG && window.DEBUG.DATA && index === 0) {
          console.warn(
            `Joint ${index} missing coordinate data:`,
            joint,
          );
        }
      }
    });

    // Draw connections between joints (bone structure)
    p5.stroke(color);
    p5.strokeWeight(3);

    // Define connections (pairs of joint indices)
    const connections = [
      // Torso
      [0, 1],
      [1, 20],
      [20, 2],
      [2, 3],
      // Left arm
      [20, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 21],
      [6, 22],
      // Right arm
      [20, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 23],
      [10, 24],
      // Left leg
      [0, 12],
      [12, 13],
      [13, 14],
      [14, 15],
      // Right leg
      [0, 16],
      [16, 17],
      [17, 18],
      [18, 19],
    ];

    // Draw lines for connections
    connections.forEach(([i, j]) => {
      if (joints[i] && joints[j]) {
        // Check if we have depthX/depthY coordinates
        if (
          'depthX' in joints[i] &&
          'depthY' in joints[i] &&
          'depthX' in joints[j] &&
          'depthY' in joints[j]
        ) {
          p5.line(
            joints[i].depthX * p5.width,
            joints[i].depthY * p5.height,
            joints[j].depthX * p5.width,
            joints[j].depthY * p5.height,
          );
        } else if (
          'cameraX' in joints[i] &&
          'cameraY' in joints[i] &&
          'cameraX' in joints[j] &&
          'cameraY' in joints[j]
        ) {
          // Fallback to camera coordinates
          const scaleFactor = 0.5; // Adjust this value as needed
          const centerX = p5.width / 2;
          const centerY = p5.height / 2;

          const x1 = centerX + joints[i].cameraX * scaleFactor;
          const y1 = centerY + joints[i].cameraY * scaleFactor;
          const x2 = centerX + joints[j].cameraX * scaleFactor;
          const y2 = centerY + joints[j].cameraY * scaleFactor;

          p5.line(x1, y1, x2, y2);
        }
      }
    });
  }

  /**
   * Draw a simplified skeleton (just dots for joints)
   * @private
   * @param {Object} body - Body data with skeleton information
   * @param {p5.Color} color - Color to use for this skeleton
   */
  _drawSimpleSkeleton(body, color) {
    if (!body.skeleton || !body.skeleton.joints) {
      console.warn('No skeleton joints in body data');
      return;
    }

    const p5 = this.p5Instance;
    const joints = body.skeleton.joints;

    // Draw joints as dots
    p5.fill(color);
    p5.noStroke();

    joints.forEach((joint, index) => {
      try {
        let x, y;
        let coordsFound = false;

        // Try different coordinate systems in order of preference
        if ('depthX' in joint && 'depthY' in joint) {
          // Use depth coordinates (normalized 0-1)
          x = joint.depthX * p5.width;
          y = joint.depthY * p5.height;
          coordsFound = true;

          // Only log when both DATA and FRAMES debugging are enabled
          if (
            window.DEBUG &&
            window.DEBUG.DATA &&
            window.DEBUG.FRAMES
          ) {
            console.log(`Joint ${index} using depthX/Y: ${x}, ${y}`);
          }
        } else if ('colorX' in joint && 'colorY' in joint) {
          // Use color coordinates (normalized 0-1)
          x = joint.colorX * p5.width;
          y = joint.colorY * p5.height;
          coordsFound = true;

          // Only log when both DATA and FRAMES debugging are enabled
          if (
            window.DEBUG &&
            window.DEBUG.DATA &&
            window.DEBUG.FRAMES
          ) {
            console.log(`Joint ${index} using colorX/Y: ${x}, ${y}`);
          }
        } else if ('cameraX' in joint && 'cameraY' in joint) {
          // Use camera coordinates with simple scaling
          const scaleFactor = 0.001; // Very small factor for camera coordinates (in mm)
          const centerX = p5.width / 2;
          const centerY = p5.height / 2;

          x = centerX + joint.cameraX * scaleFactor;
          y = centerY + joint.cameraY * scaleFactor;
          coordsFound = true;

          // Only log when both DATA and FRAMES debugging are enabled
          if (
            window.DEBUG &&
            window.DEBUG.DATA &&
            window.DEBUG.FRAMES
          ) {
            console.log(`Joint ${index} using cameraX/Y: ${x}, ${y}`);
          }
        }

        // Skip this joint if no usable coordinates
        if (!coordsFound) {
          if (
            window.DEBUG &&
            window.DEBUG.DATA &&
            window.DEBUG.FRAMES
          ) {
            console.warn(`Joint ${index} has no usable coordinates`);
          }
          return;
        }

        // Draw a smaller dot for the joint
        p5.ellipse(x, y, 10, 10);
      } catch (error) {
        if (
          window.DEBUG &&
          window.DEBUG.DATA &&
          window.DEBUG.FRAMES
        ) {
          console.error(`Error drawing joint ${index}:`, error);
        }
      }
    });
  }

  /**
   * Set active state
   * @param {boolean} active - Whether the visualizer is active
   */
  setActive(active) {
    this.isActive = active;
    if (!active) {
      this.frameCount = 0;
    }
  }
}
