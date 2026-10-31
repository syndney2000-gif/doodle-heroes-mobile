import React, { forwardRef, useImperativeHandle } from 'react';
export const View = forwardRef(({ children, ...props }, ref) => {
  useImperativeHandle(ref, () => ({ measureInWindow: callback => callback(0, 0, 340, 500) }));
  return React.createElement('View', props, children);
});
const host = name => ({ children, ...props }) => React.createElement(name, props, children);
export const Text = host('Text'), Pressable = host('Pressable'), ScrollView = host('ScrollView'), TextInput = forwardRef(({ children, ...props }, ref) => {
  useImperativeHandle(ref, () => ({ focus() {} })); return React.createElement('TextInput', props, children);
});
export const ActivityIndicator = host('ActivityIndicator'), Switch = host('Switch');
export const Modal = ({ visible, children }) => visible ? React.createElement('Modal', {}, children) : null;
export const StyleSheet = { create: value => value, absoluteFill: {}, absoluteFillObject: {} };
class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate() { return this.value; } }
const motion = (value, config) => ({ start(callback) { value?.setValue?.(config?.toValue); callback?.({ finished: true }); }, stop() {} });
export const Animated = { Value, View, timing: motion, spring: motion, loop: () => ({ start() {}, stop() {} }), sequence: () => ({ start() {}, stop() {} }) };
export const Easing = { sin: x => x, inOut: x => x };
export const PanResponder = { create: config => ({ panHandlers: config }) };
export const AppState = { currentState: 'active', listeners: new Set(), addEventListener(_, callback) { this.listeners.add(callback); return { remove: () => this.listeners.delete(callback) }; } };
export const BackHandler = { addEventListener: () => ({ remove() {} }) };
export const AccessibilityInfo = { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }), announceForAccessibility() {} };
export const Alert = { last: null, alert(...args) { this.last = args; } };
export const Share = { share: async () => ({ action: 'sharedAction' }) };
export const Keyboard = { dismiss() {} };
export const Platform = { OS: 'android' };

export const KeyboardAvoidingView = View;
