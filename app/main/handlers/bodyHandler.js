// main/handlers/bodyHandler.js
import { ipcMain } from 'electron';
import { BaseStreamHandler } from './baseHandler.js';
import { BodyFrameProcessor } from '../processors/bodyProcessor.js';
import { KinectOptions } from '../kinectController.js';
import { log } from '../utils/debug.js';

/**
 * Handles body tracking stream operations and IPC communication
 */
export class BodyStreamHandler extends BaseStreamHandler {
  constructor(kinectController, peerManager) {
    super(kinectController, peerManager);
    this.processor = new BodyFrameProcessor();
    this.frameCallback = null;
  }

  /**
   * Create frame callback for processing body frames
   * @param {Electron.IpcMainInvokeEvent} event
   */
  createFrameCallback(event) {
    this.frameCallback = (data) => {
      if (data.bodyFrame && data.bodyFrame.numBodies > 0) {
        const processedData = this.processFrame(data.bodyFrame);
        if (processedData) {
          // Send to renderer process
          event.sender.send('body-frame', processedData);

          // Create a data package for broadcasting to peers
          const framePackage = this.createDataPackage(
            'bodyFrame',
            processedData,
          );

          // Broadcast to peers - use 'bodyFrame' event to match client listener
          this.broadcastFrame('bodyFrame', framePackage, true);

          log.frame(
            `BodyStreamHandler: Broadcasting body frame data Bodies: ${
              processedData.bodies ? processedData.bodies.length : 0
            }`,
          );
        }
      }
    };
  }

  /**
   * Set up IPC handlers for body tracking stream
   */
  setupHandler() {
    // Check if handler is already registered
    if (ipcMain.listenerCount('start-body-tracking') > 0) {
      log.handler(
        'Handler for start-body-tracking already registered',
      );
      return;
    }

    ipcMain.handle('start-body-tracking', async (event) => {
      try {
        log.info(
          'BodyStreamHandler: Received start-body-tracking request',
        );

        // First, ensure any previous tracking is stopped
        if (this.isActive) {
          log.handler(
            'BodyStreamHandler: Stopping previous body tracking session',
          );
          await this.stopStream();
        }

        // Start the body tracking with a simpler approach based on legacy code
        log.handler(
          'BodyStreamHandler: Starting body tracking with options:',
          KinectOptions.BODY,
        );

        // Start cameras with the right options
        const success = this.kinectController.startBodyTracking({
          ...KinectOptions.BODY,
        });

        if (success) {
          log.info(
            'BodyStreamHandler: Body tracking started successfully',
          );
          this.isActive = true;

          // Create the frame callback
          log.handler('BodyStreamHandler: Creating frame callback');
          this.createFrameCallback(event);

          // Start listening for frames
          if (!this.isMultiFrame) {
            log.handler(
              'BodyStreamHandler: Starting to listen for Kinect frames',
            );
            this.kinectController.startListening(this.frameCallback);
            log.info(
              'BodyStreamHandler: Successfully started listening for Kinect frames',
            );
          }
        } else {
          log.error(
            'BodyStreamHandler: Failed to start body tracking',
          );
        }

        return success;
      } catch (error) {
        log.error(
          'BodyStreamHandler: Error in start-body-tracking:',
          error,
        );
        return this.handleError(error, 'starting body tracking');
      }
    });
  }

  /**
   * Process a body frame
   * @param {Object} frame Raw body frame data
   * @returns {Object} Processed frame data
   */
  processFrame(frame) {
    return this.processor.processFrame(frame);
  }

  /**
   * Start the body tracking stream
   * @returns {Promise<boolean>} Success status
   */
  async startStream() {
    try {
      // This is now a simpler wrapper around the IPC handler logic
      log.handler('BodyStreamHandler: startStream called');

      // Start cameras with the right options
      const success = this.kinectController.startBodyTracking({
        ...KinectOptions.BODY,
      });

      if (success) {
        this.isActive = true;
      }

      return success;
    } catch (error) {
      log.error('BodyStreamHandler: Error in startStream:', error);
      return this.handleError(error, 'starting body tracking');
    }
  }

  /**
   * Get the IPC handler name for this stream
   * @protected
   * @returns {string} The handler name
   */
  getHandlerName() {
    return 'start-body-tracking';
  }

  /**
   * Stop the body tracking stream
   * @returns {Promise<void>}
   */
  async stopStream() {
    try {
      log.info('BodyStreamHandler: Stopping body tracking stream');

      // Only try to stop listening if we have a callback
      if (this.frameCallback) {
        try {
          log.handler('BodyStreamHandler: Stopping frame listening');
          await this.kinectController.stopListening();
        } catch (error) {
          log.warn(
            'BodyStreamHandler: Error stopping listening (may be normal):',
            error.message,
          );
        }
        this.frameCallback = null;
      }

      // Stop cameras
      try {
        log.handler('BodyStreamHandler: Stopping cameras');
        await this.kinectController.stopCameras();
      } catch (error) {
        log.warn(
          'BodyStreamHandler: Error stopping cameras:',
          error.message,
        );
      }

      this.isActive = false;
      log.info('BodyStreamHandler: Body tracking stream stopped');
    } catch (error) {
      log.error('BodyStreamHandler: Error in stopStream:', error);
      this.handleError(error, 'stopping body tracking');
    }
  }
}
