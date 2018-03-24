import { LightroomSource } from './lightroom-source';

export const LightroomWindowsSourceKey = 'lightroom-windows';

export class LightroomWindowsSource extends LightroomSource {

  protected isPhotoBorderColor(r: number, g: number, b: number): boolean {
    return this.isPhotoBorderGrayscale(r) && this.isPhotoBorderGrayscale(g) && this.isPhotoBorderGrayscale(b);
  }

  private isPhotoBorderGrayscale(color: number) {
    const min = 125;
    const max = 129;
    return color >= min && color <= max;
  }


  protected isActiveHistoryItemColor(r: number, g: number, b: number): boolean {
    return this.isActiveHistoryItemGrayscale(r) && this.isActiveHistoryItemGrayscale(g) && this.isActiveHistoryItemGrayscale(b);
  }

  private isActiveHistoryItemGrayscale(color: number) {
    const min: number = 177;
    const max: number = 179;
    return color >= min && color <= max;
  }
}
