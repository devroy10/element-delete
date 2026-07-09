class Stitcher {
  constructor(totalWidth, totalHeight) {
    this.totalWidth = Math.ceil(totalWidth);
    this.totalHeight = Math.ceil(totalHeight);
    this.flushedY = 0;
    this.tiles = [];
    this.MAX_TILE = 8192;
    this.canvas = null;
    this.ctx = null;
    this._initCanvas();
  }

  _initCanvas() {
    const h = Math.min(this.totalHeight - this.flushedY, this.MAX_TILE);
    this.canvas = new OffscreenCanvas(this.totalWidth, h);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
  }

  blit(img, srcX, srcY, srcW, srcH, destX, destY) {
    const bottom = destY + srcH;
    while (bottom > this.flushedY + this.canvas.height) {
      this._flush();
    }
    this.ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY - this.flushedY, srcW, srcH);
  }

  async _flush() {
    this.flushedY += this.canvas.height;
    const blob = await this.canvas.convertToBlob({ type: "image/png" });
    this.tiles.push(blob);
    this._initCanvas();
  }

  async finalize() {
    await this._flush();
    if (this.tiles.length === 1) return this.tiles[0];
    const full = new OffscreenCanvas(this.totalWidth, this.totalHeight);
    const ctx = full.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let y = 0;
    for (const blob of this.tiles) {
      const img = await createImageBitmap(blob);
      ctx.drawImage(img, 0, y);
      y += img.height;
    }
    return full.convertToBlob({ type: "image/png" });
  }
}
