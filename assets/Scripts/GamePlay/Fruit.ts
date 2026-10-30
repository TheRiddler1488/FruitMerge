import { _decorator, Component, CircleCollider2D, RigidBody2D, Sprite, ERigidBody2DType, math } from 'cc';
import { FruitConfig } from '../Managers/FruitConfig';
const { ccclass, property } = _decorator;

@ccclass('Fruit')
export class Fruit extends Component {
    @property
    public level: number = 0;
    public isMerged: boolean = false;
    public isDropped: boolean = false;

    private _rb: RigidBody2D | null = null;
    private _collider: CircleCollider2D | null = null;
    private _sprite: Sprite | null = null;

    protected onLoad(): void {
        this._rb = this.getComponent(RigidBody2D);
        this._collider = this.getComponent(CircleCollider2D);
        this._sprite = this.getComponent(Sprite);
    }

    public init(levelIndex: number, data: FruitConfig): void {
        this.level = levelIndex;
        this.isMerged = false;
        this.isDropped = false;

        if (this._sprite && data.sprite) {
            this._sprite.spriteFrame = data.sprite;
        }

        if (this._collider) {
            this._collider.radius = data.radius;
            this._collider.apply();
        }

        if (this._rb) {
            this._rb.type = ERigidBody2DType.Dynamic;
            this._rb.gravityScale = 0;
            this._rb.linearDamping = 0.5;
            this._rb.linearVelocity = math.v2(0, 0);
            this._rb.angularVelocity = 0;
            this._rb.sleep();
        }
    }

    public drop(): void {
        this.isDropped = true;
        if (this._rb) {
            this._rb.gravityScale = 1.0;
            this._rb.wakeUp();
        }
    }
}
