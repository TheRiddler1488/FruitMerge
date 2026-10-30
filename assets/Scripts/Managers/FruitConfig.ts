import { _decorator, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FruitConfig')
export class FruitConfig {
    @property
    public level: number = 0;

    @property
    public radius: number = 25;

    @property
    public scoreValue: number = 10;

    @property(SpriteFrame)
    public sprite: SpriteFrame | null = null;
}
