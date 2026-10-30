import { _decorator, Component, EventTouch, Input, input, Node, clamp, UITransform, v3 } from 'cc';
import { FruitManager } from '../Managers/FruitManager';
import { AudioManager } from '../Managers/AudioManager';
import { Fruit } from './Fruit';
const { ccclass, property } = _decorator;

@ccclass('InputController')
export class InputController extends Component {
    @property(FruitManager)
    public fruitManager: FruitManager | null = null;

    @property(Node)
    public spawnPivot: Node | null = null;

    @property(Node)
    public aimLine: Node | null = null;

    @property
    public minX: number = -230;

    @property
    public maxX: number = 230;

    private _currentFruit: Node | null = null;
    private _canDrop: boolean = true;
    private _isGameOver: boolean = false;
    private _uiTransform: UITransform | null = null;
    private _currentX: number = 0;

    protected onLoad(): void {
        this._uiTransform = this.node.parent?.getComponent(UITransform) || this.node.getComponent(UITransform) || null;

        input.on(Input.EventType.TOUCH_START, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);

        if (this.fruitManager) {
            this.fruitManager.node.on('game-restarted', this.onGameRestarted, this);
            this.fruitManager.node.on('game-over', this.onGameOver, this);
        }
    }

    protected start(): void {
        this.prepareNextFruit();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    private onGameOver(): void {
        this._isGameOver = true;
        this._canDrop = false;
        if (this.aimLine) {
            this.aimLine.active = false;
        }
        if (this._currentFruit) {
            this.fruitManager?.recycleFruit(this._currentFruit);
            this._currentFruit = null;
        }
    }

    private onGameRestarted(): void {
        this._isGameOver = false;
        if (this._currentFruit) {
            this.fruitManager?.recycleFruit(this._currentFruit);
            this._currentFruit = null;
        }
        this.prepareNextFruit();
    }

    private prepareNextFruit(): void {
        if (this._isGameOver || !this.fruitManager || !this.spawnPivot) return;

        const randLevel = Math.floor(Math.random() * 3);
        const spawnPos = this.spawnPivot.worldPosition;

        this._currentFruit = this.fruitManager.spawnFruit(randLevel, spawnPos);
        if (this._currentFruit) {
            const p = this._currentFruit.position;
            this._currentFruit.setPosition(this._currentX, p.y, p.z);
        }

        if (this.aimLine) {
            this.aimLine.active = true;
            this.updateAimPosition(this._currentX);
        }

        this._canDrop = true;
    }

    private onTouchMove(event: EventTouch): void {
        if (this._isGameOver || !this._currentFruit || !this._canDrop || !this._uiTransform) return;

        const touchLoc = event.getUILocation();
        const localPos = this._uiTransform.convertToNodeSpaceAR(v3(touchLoc.x, touchLoc.y, 0));

        this._currentX = clamp(localPos.x, this.minX, this.maxX);

        const currentPos = this._currentFruit.position;
        this._currentFruit.setPosition(this._currentX, currentPos.y, currentPos.z);
        this.updateAimPosition(this._currentX);
    }

    private updateAimPosition(x: number): void {
        if (this.aimLine) {
            const p = this.aimLine.position;
            this.aimLine.setPosition(x, p.y, p.z);
        }
    }

    private onTouchEnd(): void {
        if (this._isGameOver || !this._currentFruit || !this._canDrop) return;

        this._canDrop = false;
        if (this.aimLine) this.aimLine.active = false;

        AudioManager.instance?.playPutSound();

        const fruitComp = this._currentFruit.getComponent(Fruit);
        fruitComp?.drop();

        this._currentFruit = null;

        this.scheduleOnce(() => {
            this.prepareNextFruit();
        }, 0.55);
    }
}
