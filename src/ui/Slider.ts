import Phaser from 'phaser';

export interface SliderOptions {
  x: number;
  y: number;
  width: number;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange?: (value: number) => void;
  trackColor?: number;
  fillColor?: number;
  handleColor?: number;
  labelStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  valueStyle?: Phaser.Types.GameObjects.Text.TextStyle;
}

export class Slider extends Phaser.GameObjects.Container {
  private track!: Phaser.GameObjects.Rectangle;
  private fill!: Phaser.GameObjects.Rectangle;
  private handle!: Phaser.GameObjects.Ellipse;
  private label!: Phaser.GameObjects.Text;
  private valueText!: Phaser.GameObjects.Text;

  private min: number;
  private max: number;
  private step: number;
  private _value: number;
  private sliderWidth: number;
  private onChange?: (value: number) => void;
  private dragging = false;

  constructor(scene: Phaser.Scene, options: SliderOptions) {
    super(scene, options.x, options.y);

    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this._value = options.value;
    this.sliderWidth = options.width;
    this.onChange = options.onChange;

    const trackColor = options.trackColor ?? 0x2a3a4a;
    const fillColor = options.fillColor ?? 0x9ed8db;
    const handleColor = options.handleColor ?? 0xf8f5f0;
    const labelStyle = options.labelStyle ?? {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#9ed8db',
    };
    const valueStyle = options.valueStyle ?? {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#f8f5f0',
    };

    this.label = scene.add.text(0, -12, options.label, labelStyle).setOrigin(0, 1);
    this.valueText = scene.add.text(options.width, -12, '', valueStyle).setOrigin(1, 1);

    const trackHeight = 8;
    this.track = scene.add
      .rectangle(0, 0, options.width, trackHeight, trackColor)
      .setOrigin(0, 0.5)
      .setInteractive();
    this.fill = scene.add
      .rectangle(0, 0, 0, trackHeight, fillColor)
      .setOrigin(0, 0.5);

    const handleRadius = 10;
    this.handle = scene.add
      .ellipse(0, 0, handleRadius * 2, handleRadius * 2, handleColor)
      .setInteractive({ useHandCursor: true });

    this.add([this.track, this.fill, this.handle, this.label, this.valueText]);

    this.updateVisuals();

    this.handle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.updateFromPointer(pointer);
    });

    this.track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.updateFromPointer(pointer);
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragging) {
        this.updateFromPointer(pointer);
      }
    });

    scene.input.on('pointerup', () => {
      this.dragging = false;
    });

    scene.add.existing(this);
  }

  get value(): number {
    return this._value;
  }

  set value(v: number) {
    this._value = Phaser.Math.Clamp(v, this.min, this.max);
    this.updateVisuals();
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer) {
    const localX = pointer.x - this.x - this.track.x;
    const ratio = Phaser.Math.Clamp(localX / this.sliderWidth, 0, 1);
    const raw = this.min + ratio * (this.max - this.min);
    const stepped = Math.round(raw / this.step) * this.step;
    this._value = Phaser.Math.Clamp(stepped, this.min, this.max);
    this.updateVisuals();
    this.onChange?.(this._value);
  }

  private updateVisuals() {
    const ratio = (this._value - this.min) / (this.max - this.min);
    const fillWidth = ratio * this.sliderWidth;
    this.fill.setSize(fillWidth, this.fill.height);
    this.handle.setPosition(fillWidth, 0);
    this.valueText.setText(`${Math.round(this._value)}`);
  }

  destroy(fromScene?: boolean) {
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    super.destroy(fromScene);
  }
}
