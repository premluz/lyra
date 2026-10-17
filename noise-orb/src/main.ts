import './style.css';
import { Session } from './session';
import { report } from './ui';

try { new Session(); } catch (error) { report(error); }
