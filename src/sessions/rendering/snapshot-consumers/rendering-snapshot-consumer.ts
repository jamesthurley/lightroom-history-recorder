import { ISnapshotConsumer } from '../../pipeline/snapshot-consumer';
import { ISnapshot } from '../../pipeline/snapshot';
import { IFrameConsumer } from '../../pipeline/frame-consumer';
import * as Jimp from 'jimp';
import { Log } from '../../../common/log';
import { Frame } from '../../pipeline/frame';
import { FitFrameSizeToTarget } from '../fit-frame-size-to-target';
import { Size, ISize } from '../../../common/size';
import { FrameMetadata } from '../../pipeline/frame-metadata';
import { DebugImage } from '../../pipeline/debug-image';

export const LONG_FRAME_DELAY_CENTISECS = 200;
export const SHORT_FRAME_DELAY_CENTISECS = 50;

export class RenderingSnapshotConsumer implements ISnapshotConsumer {

  private snapshots: ISnapshot[] = [];
  private maxFrameSize: Size = new Size(0, 0);
  private targetFrameSize: Size = this.maxFrameSize;

  constructor(
    private readonly frameConsumer: IFrameConsumer) {
  }

  public consumeDebugImages(debugImages: ReadonlyArray<DebugImage>): Promise<void> {
    return Promise.resolve();
  }

  public consume(snapshot: ISnapshot): Promise<void> {
    this.snapshots.push(snapshot);

    if (this.snapshots.length === 1) {
      this.maxFrameSize = new Size(
        snapshot.photoRectangle.width,
        snapshot.photoRectangle.height);
    }
    else {
      this.maxFrameSize = new Size(
        Math.max(this.maxFrameSize.width, snapshot.photoRectangle.width),
        Math.max(this.maxFrameSize.height, snapshot.photoRectangle.height));
    }

    return Promise.resolve();
  }

  public async complete(): Promise<void> {

    if (this.snapshots.length < 2) {
      Log.warn('At least two snapshots are required to render frames.');
      return;
    }

    // We are switching to targeting the final frame size rather than the maximum frame size, so the video
    // aspect ratio matches the image size for instagram.
    //// this.maxFrameSize = FitFrameSizeToTarget.execute(this.maxFrameSize);
    Log.verbose(`Using ${this.snapshots.length} snapshots.`);
    const finalSnapshot = this.snapshots[this.snapshots.length - 1];
    const finalPhoto = await finalSnapshot.loadPhoto();
    const finalSnapshotSize = new Size(finalPhoto.bitmap.width, finalPhoto.bitmap.height);
    Log.verbose(`Final photo size is ${finalSnapshotSize.width}x${finalSnapshotSize.height}.`);
    this.targetFrameSize = FitFrameSizeToTarget.execute(finalSnapshotSize);
    Log.verbose(`Target frame size is ${this.targetFrameSize.width}x${this.targetFrameSize.height}.`);

    await this.addTitleFrame();
    await this.addInitialImageFrame();

    for (const snapshot of this.snapshots.slice(1)) {
      const photo = await snapshot.loadPhoto();
      const historyItem = await snapshot.loadHistoryItem();

      const frame = this.createFrameFromPhoto(photo, this.targetFrameSize);

      const overlay = historyItem;
      overlay.opacity(0.8);
      frame.composite(
        overlay,
        Math.floor(frame.bitmap.width / 2) - Math.floor(snapshot.historyItemRectangle.width / 2),
        0 /*frame.bitmap.height - snapshot.historyItemRectangle.height */);

      await this.frameConsumer.consume(new Frame(frame, new FrameMetadata(SHORT_FRAME_DELAY_CENTISECS)));
    }

    await this.addFinalImageFrame();

    await this.frameConsumer.complete();
  }

  private async addTitleFrame(): Promise<void> {
    // For the title frame we want to show a split before/after view.
    const initialPhoto = await this.snapshots[0].loadPhoto();
    const finalPhoto = await this.snapshots[this.snapshots.length - 1].loadPhoto();

    const width = this.targetFrameSize.width;
    const height = this.targetFrameSize.height;
    const halfWidth = Math.floor(this.targetFrameSize.width / 2);

    initialPhoto.cover(width, height);
    finalPhoto.cover(width, height);

    initialPhoto.crop(0, 0, halfWidth, height);
    finalPhoto.composite(initialPhoto, 0, 0);

    const white = Jimp.rgbaToInt(255, 255, 255, 255);
    for (let y = 0; y < height; ++y) {
      finalPhoto.setPixelColor(white, halfWidth, y);
      finalPhoto.setPixelColor(white, halfWidth + 1, y);
    }

    await this.frameConsumer.consume(new Frame(finalPhoto, new FrameMetadata(LONG_FRAME_DELAY_CENTISECS)));
  }

  private async addInitialImageFrame(): Promise<void> {
    // For the first frame we want to show the initial photo with no history item.
    const photo = await this.snapshots[0].loadPhoto();
    const frame = this.createFrameFromPhoto(photo, this.targetFrameSize);
    await this.frameConsumer.consume(new Frame(frame, new FrameMetadata(SHORT_FRAME_DELAY_CENTISECS)));
  }

  private async addFinalImageFrame(): Promise<void> {
    // For the last frame we want to show the final photo with no history item.
    const photo = await this.snapshots[this.snapshots.length - 1].loadPhoto();
    const frame = this.createFrameFromPhoto(photo, this.targetFrameSize);
    await this.frameConsumer.consume(new Frame(frame, new FrameMetadata(LONG_FRAME_DELAY_CENTISECS)));
  }

  private createFrameFromPhoto(source: Jimp, frameSize: ISize): Jimp {
    const frame = source.clone();

    const initialWidth = frame.bitmap.width;
    const initialHeight = frame.bitmap.height;
    frame.scaleToFit(frameSize.width, frameSize.height);
    frame.contain(frameSize.width, frameSize.height);
    Log.info(`Resized photo from ${initialWidth}x${initialHeight} to ${frame.bitmap.width}x${frame.bitmap.height}.`);

    return frame;
  }
}
