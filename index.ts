import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widget/handler';

registerRootComponent(App);
// Registers the headless task that draws the widget. Safe in Expo Go — it is an
// AppRegistry registration that only fires under a real widget host.
registerWidgetTaskHandler(widgetTaskHandler);
