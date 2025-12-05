import { OneKit } from '../core/index';

// Animation methods
const animations = {
  scaleIn(this: OneKit, duration = 300): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'scale(0)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      element.offsetHeight;

      element.style.transform = 'scale(1)';
      element.style.opacity = '1';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  scaleOut(this: OneKit, duration = 300): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
      element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;

      element.offsetHeight;

      element.style.transform = 'scale(0)';
      element.style.opacity = '0';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  rotateIn(this: OneKit, duration = 500): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'rotate(-180deg) scale(0)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      element.offsetHeight;

      element.style.transform = 'rotate(0) scale(1)';
      element.style.opacity = '1';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  rotateOut(this: OneKit, duration = 500): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'rotate(0) scale(1)';
      element.style.opacity = '1';
      element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;

      element.offsetHeight;

      element.style.transform = 'rotate(180deg) scale(0)';
      element.style.opacity = '0';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  bounce(this: OneKit, duration = 1000): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.animation = `bounce ${duration}ms ease-in-out`;

      setTimeout(() => {
        element.style.animation = '';
      }, duration);
    });
  },

  shake(this: OneKit, duration = 500): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.animation = `shake ${duration}ms ease-in-out`;

      setTimeout(() => {
        element.style.animation = '';
      }, duration);
    });
  },

  slideInLeft(this: OneKit, duration = 400): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'translateX(-100%)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      element.offsetHeight;

      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  slideInRight(this: OneKit, duration = 400): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'translateX(100%)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      element.offsetHeight;

      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  slideInUp(this: OneKit, duration = 400): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'translateY(100%)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      element.offsetHeight;

      element.style.transform = 'translateY(0)';
      element.style.opacity = '1';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  slideInDown(this: OneKit, duration = 400): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'translateY(-100%)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      element.offsetHeight;

      element.style.transform = 'translateY(0)';
      element.style.opacity = '1';

      setTimeout(() => {
        element.style.transition = '';
      }, duration);
    });
  },

  flip(this: OneKit, duration = 600): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.transform = 'rotateY(0)';
      element.style.transition = `transform ${duration}ms ease-in-out`;

      element.offsetHeight;

      element.style.transform = 'rotateY(360deg)';

      setTimeout(() => {
        element.style.transition = '';
        element.style.transform = '';
      }, duration);
    });
  },

  pulse(this: OneKit, duration = 1000, iterations = 1): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.animation = `pulse ${duration}ms ease-in-out ${iterations}`;

      setTimeout(() => {
        element.style.animation = '';
      }, duration * iterations);
    });
  },

  glow(this: OneKit, duration = 1000, color = '#ffff00'): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.boxShadow = `0 0 5px ${color}`;
      element.style.transition = `box-shadow ${duration}ms ease-in-out`;

      element.offsetHeight;

      element.style.boxShadow = `0 0 20px ${color}, 0 0 30px ${color}`;

      setTimeout(() => {
        element.style.boxShadow = `0 0 5px ${color}`;
        setTimeout(() => {
          element.style.transition = '';
          element.style.boxShadow = '';
        }, duration);
      }, duration);
    });
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce { 0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); } 40%, 43% { transform: translate3d(0, -30px, 0); } 70% { transform: translate3d(0, -15px, 0); } 90% { transform: translate3d(0, -4px, 0); } }
  @keyframes shake { 0%, 100% { transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); } }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
`;
document.head.appendChild(style);

// Add animations to OneKit prototype
Object.keys(animations).forEach(name => {
  (OneKit.prototype as any)[name] = animations[name as keyof typeof animations];
});

export { animations };
