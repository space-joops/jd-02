# 🎵 Procedural 8-bit Audio Synthesis Engine

## 🎯 Design Vision
Instead of relying on external `.mp3` assets that bloat the PWA payload, we synthesize 8-bit sounds natively using the Web Audio API to achieve a true retro aesthetic.

## ✅ Completed Features
- **Dynamic Oscillators**: Real-time generation of square/sawtooth/triangle waves for eating, getting hit, and game over.
- **Engine Thrust Sound**: A low-frequency rumbling sound that dynamically scales its pitch and volume based on the active thrust level of the joystick.
- **Mobile Autoplay Bypass**: Implemented a brilliant workaround that plays a silent oscillator on the first touch event to unlock the `AudioContext` on strict mobile browsers like iOS Safari.

## 🧠 Designer's Note
The procedural audio gives the game an authentic arcade feel. The rising pitch for "eating" and the dissonant descending sawtooth for "hit" perfectly communicate game state without visual cues.
