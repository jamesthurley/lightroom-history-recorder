import * as Jimp from 'jimp';
import * as fse from 'fs-extra';
import { ISnapshotProducer } from './snapshot-producer';
import { SnapshotFolderUtilities } from '../snapshot-folder-utilities';
import { ISnapshot, LazySnapshot } from '../snapshot';
import { join } from 'path';
import { Constants } from '../../common/constants';
import { SessionSnapshotFolderReader } from '../session-snapshot-folder-reader';
import { IRectangle } from '../../common/rectangle';

export class FilesystemSnapshotProducer extends SessionSnapshotFolderReader implements ISnapshotProducer {

  constructor(
    sourceFolder: string,
    snapshotFolderUtilities: SnapshotFolderUtilities) {
    super(sourceFolder, snapshotFolderUtilities);
  }

  public async getNextSnapshot(snapshot: ISnapshot | undefined): Promise<ISnapshot | undefined> {
    const folder = this.getNextFolder();
    if (!folder) {
      return undefined;
    }

    const screenshot: () => Promise<Jimp> = () => Jimp.read(join(folder, Constants.ScreenshotFileName));

    const photo: () => Promise<Jimp> = () => Jimp.read(join(folder, Constants.PhotoFileName));
    const historyItem: () => Promise<Jimp> = () => Jimp.read(join(folder, Constants.HistoryItemFileName));

    const photoMetadata: IRectangle = fse.readJsonSync(join(folder, Constants.PhotoMetadataFileName));
    const historyItemMetadata: IRectangle = fse.readJsonSync(join(folder, Constants.HistoryItemMetadataFileName));

    return new LazySnapshot(screenshot, photoMetadata, photo, historyItemMetadata, historyItem);
  }
}
