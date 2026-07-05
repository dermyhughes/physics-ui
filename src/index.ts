/**
 * TUMBLE — a design system with consequences.
 *
 * Wrap your app in <PhysicsWorld> and compose like any component library.
 * Everything else is gravity's problem.
 */

export { PhysicsWorld, PhysicsExempt, useWorld, useFrame, usePhysicsExempt } from './physics/PhysicsWorld';
export type { BodyEntry, ImpactInfo, LooseSpec, FlowBodyOptions } from './physics/PhysicsWorld';
export { usePhysicsBody } from './physics/usePhysicsBody';
export { MATERIALS, CATEGORY } from './physics/materials';
export type { MaterialName, Material } from './physics/materials';
export { setMuted, isMuted, playEffect } from './physics/sound';

export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';
export { RadioGroup, Radio } from './components/Radio';
export type { RadioGroupProps, RadioProps } from './components/Radio';
export { Checkbox } from './components/Checkbox';
export type { CheckboxProps } from './components/Checkbox';
export { Toggle } from './components/Toggle';
export type { ToggleProps } from './components/Toggle';
export { Input } from './components/Input';
export type { InputProps } from './components/Input';
export { Card } from './components/Card';
export type { CardProps } from './components/Card';
export { Modal } from './components/Modal';
export type { ModalProps } from './components/Modal';
export { PhysicsText } from './components/Text';
export type { PhysicsTextProps } from './components/Text';
export { Conveyor } from './components/Conveyor';
export type { ConveyorProps } from './components/Conveyor';
export { Bumper } from './components/Bumper';
export type { BumperProps } from './components/Bumper';
