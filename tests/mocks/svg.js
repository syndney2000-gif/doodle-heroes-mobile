import React from 'react';
const host = name => ({ children, ...props }) => React.createElement(name, props, children);
export default host('Svg');
export const Circle = host('Circle'), Line = host('Line'), Path = host('Path'), G = host('G'), Rect = host('Rect'), Ellipse = host('Ellipse');
