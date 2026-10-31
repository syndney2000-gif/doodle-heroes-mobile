import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { colors as C } from '../theme';

export default function Island({ reducedMotion = false, small = false }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    drift.setValue(0);
    if (reducedMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: -4, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [reducedMotion, drift]);
  return <Animated.View accessible accessibilityLabel="An illustrated island with a lighthouse, cottages and a winding path" style={[styles.wrap, small && { height: 120 }, { transform: [{ translateY: drift }] }]}>
    <Svg width="100%" height="100%" viewBox="0 0 330 190" fill="none">
      <Ellipse cx="166" cy="166" rx="132" ry="13" fill="#DAE4D0" />
      <Circle cx="266" cy="37" r="23" fill="#EBD18E" />
      <Path d="M12 139Q60 119 110 133T230 131T320 139" stroke="#BBCCA8" strokeWidth="2" strokeDasharray="5 8" />
      <Path d="M40 140Q46 102 98 104Q127 62 174 87Q237 75 272 131L290 149Q213 180 118 163Q62 162 40 140Z" fill="#B8C9A0" stroke={C.ink} strokeWidth="1.6" />
      <Path d="M86 144Q128 116 176 137T257 140" stroke="#FFF8DD" strokeWidth="11" strokeLinecap="round" />
      <G stroke={C.ink} strokeWidth="1.8">
        <Path d="M159 116L164 47H187L194 116Z" fill="#FFF7DC" />
        <Path d="M164 78H190L191 90H163Z" fill="#D37B5C" stroke="none" />
        <Path d="M159 48L176 30L193 48Z" fill="#D37B5C" strokeLinejoin="round" />
        <Path d="M160 58H192M162 44H190M173 116V101H181V116M171 62V71M182 62V71" />
        <Path d="M157 65L106 50V81Z" fill="#FFE394" opacity=".5" stroke="none" />
        <Path d="M79 140V117L99 102L121 117V143Z" fill="#FAF0D5" />
        <Path d="M75 118L99 99L125 118" stroke="#A76C51" strokeWidth="5" strokeLinecap="round" />
        <Path d="M95 142V127H104V143M85 122H91M110 122H116" />
        <Path d="M225 138V119L242 107L258 120V140Z" fill="#F2DDB8" />
        <Path d="M220 121L242 103L263 121" stroke="#A76C51" strokeWidth="5" strokeLinecap="round" />
        <Path d="M239 140V129H246V140" />
        <Path d="M59 133V106M50 121Q60 94 69 121ZM207 139V112M198 126Q207 99 217 126Z" fill="#67866A" />
        <Path d="M42 54Q48 46 54 54Q60 46 66 54M220 59Q225 53 231 59Q237 53 243 59" strokeLinecap="round" />
      </G>
    </Svg>
  </Animated.View>;
}
const styles = StyleSheet.create({ wrap: { width: '100%', height: 190 } });
