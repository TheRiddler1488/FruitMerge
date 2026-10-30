import { _decorator, Component, Node, Prefab, instantiate, NodePool, Vec3, Label, PhysicsSystem2D, Contact2DType, Collider2D, IPhysics2DContact, Sprite, game, v2 } from 'cc';
import { FruitConfig } from './FruitConfig';
import { Fruit } from '../GamePlay/Fruit';
import { AudioManager } from './AudioManager';
import { CtaScreen } from './CtaScreen';
const { ccclass, property } = _decorator;

@ccclass('FruitManager')
export class FruitManager extends Component {
    @property({ type: [FruitConfig] })
    public fruitConfigs: FruitConfig[] = [];

    @property(Prefab)
    public fruitPrefab: Prefab | null = null;

    @property(Node)
    public container: Node | null = null;

    @property(Label)
    public scoreLabel: Label | null = null;

    @property({
        tooltip: 'Уровень фрукта для победы (5 или 6 для ~60-70 сек геймплея)'
    })
    public targetLevel: number = 5;

    @property({
        type: Sprite,
        tooltip: 'Спрайт наверху экрана, показывающий какой фрукт нужно собрать'
    })
    public targetFruitSprite: Sprite | null = null;

    @property({
        type: CtaScreen,
        tooltip: 'Независимый контроллер экрана победы (CTA)'
    })
    public ctaScreen: CtaScreen | null = null;

    private _pool: NodePool = new NodePool();
    private _score: number = 0;
    private _isGameOver: boolean = false;
    private static readonly _midPos = new Vec3();

    protected onLoad(): void {
        const phys = PhysicsSystem2D.instance;
        phys.gravity = v2(0, -900);
        phys.fixedTimeStep = 1 / 60;
        phys.maxSubSteps = 8;

        const initialPoolSize = 35;
        for (let i = 0; i < initialPoolSize; i++) {
            if (this.fruitPrefab) {
                this._pool.put(instantiate(this.fruitPrefab));
            }
        }

        PhysicsSystem2D.instance.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        this.updateScoreUI();
    }

    protected start(): void {
        this._isGameOver = false;

        if (this.targetFruitSprite && this.fruitConfigs[this.targetLevel]) {
            this.targetFruitSprite.spriteFrame = this.fruitConfigs[this.targetLevel].sprite;
        }

        if (!this.container) return;

        this.container.children.forEach((child) => {
            const fruitComp = child.getComponent(Fruit);
            if (fruitComp) {
                const lvl = fruitComp.level;
                if (this.fruitConfigs[lvl]) {
                    fruitComp.init(lvl, this.fruitConfigs[lvl]);
                    fruitComp.drop();
                }
            }
        });
    }

    protected onDestroy(): void {
        if (PhysicsSystem2D.instance) {
            PhysicsSystem2D.instance.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    public spawnFruit(level: number, worldPos: Vec3): Node | null {
        if (level >= this.fruitConfigs.length) return null;

        const config = this.fruitConfigs[level];
        const fruitNode = this._pool.size() > 0 ? this._pool.get()! : instantiate(this.fruitPrefab!);

        fruitNode.setParent(this.container);
        fruitNode.setWorldPosition(worldPos);

        const fruitComp = fruitNode.getComponent(Fruit)!;
        fruitComp.init(level, config);

        return fruitNode;
    }

    public recycleFruit(node: Node): void {
        this._pool.put(node);
    }

    public restartGame(): void {
        if (!this.container) return;
        const children = [...this.container.children];
        children.forEach((child) => this.recycleFruit(child));

        this._score = 0;
        this._isGameOver = false;
        this.updateScoreUI();
        this.node.emit('game-restarted');
    }

    private updateScoreUI(): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = this._score.toString();
        }
    }

    private onBeginContact(colliderA: Collider2D, colliderB: Collider2D, _contact: IPhysics2DContact): void {
        if (this._isGameOver) return;

        const fruitA = colliderA.getComponent(Fruit);
        const fruitB = colliderB.getComponent(Fruit);

        if (!fruitA || !fruitB) return;
        if (!fruitA.isDropped || fruitA.isMerged) return;
        if (!fruitB.isDropped || fruitB.isMerged) return;

        if (fruitA.level === fruitB.level) {
            fruitA.isMerged = true;
            fruitB.isMerged = true;

            Vec3.lerp(FruitManager._midPos, fruitA.node.worldPosition, fruitB.node.worldPosition, 0.5);

            const mergeLevel = fruitA.level;
            const spawnPos = FruitManager._midPos.clone();

            this.scheduleOnce(() => {
                this.executeMerge(mergeLevel, spawnPos, fruitA.node, fruitB.node);
            }, 0);
        }
    }

    private executeMerge(level: number, position: Vec3, nodeA: Node, nodeB: Node): void {
        if (this._isGameOver) return;

        const nextLevel = level + 1;
        let nextFruit: Node | null = null;

        if (nextLevel < this.fruitConfigs.length) {
            nextFruit = this.spawnFruit(nextLevel, position);
        }

        this.recycleFruit(nodeA);
        this.recycleFruit(nodeB);

        AudioManager.instance?.playPopSound();

        this._score += this.fruitConfigs[level]?.scoreValue ?? 10;
        this.updateScoreUI();

        if (nextFruit) {
            nextFruit.getComponent(Fruit)?.drop();
        }

        if (nextLevel >= this.targetLevel) {
            this._isGameOver = true;
            this.node.emit('game-over');
            this.ctaScreen?.show(0.8);
        }
    }
}
