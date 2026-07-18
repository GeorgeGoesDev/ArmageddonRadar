import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { colors } from '../theme/colors';
import { WidgetState } from './snapshot';

// The whole card opens the app (which refreshes the feed and repaints the
// widget) — this doubles as the "Tap to refresh" action the stale states name.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: colors.spaceBlack,
        borderRadius: 16,
        padding: 14,
      }}
    >
      {children}
    </FlexWidget>
  );
}

function Header({ text }: { text: string }) {
  return (
    <TextWidget
      text={text}
      style={{ fontSize: 11, color: colors.accentBlue, letterSpacing: 1.5 }}
    />
  );
}

export function NextApproachWidget({ state }: { state: WidgetState }) {
  if (state.kind === 'empty') {
    return (
      <Frame>
        <Header text={`☄ ${state.chrome.radar}`} />
        <TextWidget text={state.chrome.tapStart} style={{ fontSize: 15, color: colors.textMuted }} />
        <TextWidget text=" " style={{ fontSize: 11, color: colors.textMuted }} />
      </Frame>
    );
  }
  if (state.kind === 'expired') {
    return (
      <Frame>
        <Header text={`☄ ${state.chrome.radar}`} />
        <TextWidget text={state.chrome.expired} style={{ fontSize: 15, color: colors.textMuted }} />
        <TextWidget text={state.chrome.tapRefresh} style={{ fontSize: 11, color: colors.textMuted }} />
      </Frame>
    );
  }

  const { entry } = state;
  return (
    <Frame>
      <Header text={`☄ ${state.chrome.nextApproach}`} />
      <TextWidget text={entry.name} style={{ fontSize: 20, color: colors.textPrimary, fontWeight: '700' }} />
      <TextWidget
        text={`${entry.distance}  ·  ${entry.absoluteTime}`}
        style={{ fontSize: 13, color: colors.textMuted }}
      />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget
          style={{
            height: 6,
            width: 120,
            borderRadius: 3,
            backgroundColor: entry.threatColor as `#${string}`,
          }}
        />
        <TextWidget
          text={`  ${entry.threatLabel}`}
          style={{ fontSize: 12, color: entry.threatColor as `#${string}`, fontWeight: '700' }}
        />
      </FlexWidget>
    </Frame>
  );
}
