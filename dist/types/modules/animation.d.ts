import { OneKit } from '../core/index';
declare const animations: {
    scaleIn(this: OneKit, duration?: number): OneKit;
    scaleOut(this: OneKit, duration?: number): OneKit;
    rotateIn(this: OneKit, duration?: number): OneKit;
    rotateOut(this: OneKit, duration?: number): OneKit;
    bounce(this: OneKit, duration?: number): OneKit;
    shake(this: OneKit, duration?: number): OneKit;
    slideInLeft(this: OneKit, duration?: number): OneKit;
    slideInRight(this: OneKit, duration?: number): OneKit;
    slideInUp(this: OneKit, duration?: number): OneKit;
    slideInDown(this: OneKit, duration?: number): OneKit;
    flip(this: OneKit, duration?: number): OneKit;
    pulse(this: OneKit, duration?: number, iterations?: number): OneKit;
    glow(this: OneKit, duration?: number, color?: string): OneKit;
};
export { animations };
