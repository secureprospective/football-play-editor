import '../Toolbar/Toolbar.css';
import './AppHeader.css';
import useDataStore from '../../store/useDataStore';
import useUIStore from '../../store/useUIStore';
import { THEME_LOGO } from '../../constants/themeColors';
import { triggerHaptic } from '../../utils/haptics';

export default function AppHeader({ crumbs = [], active, onAdd, addLabel, actions }) {
  const goBack = useDataStore(s => s.goBack);
  const theme  = useUIStore(s => s.theme);
  const logo = THEME_LOGO[theme] || THEME_LOGO['theme-sun-cyan'];

  return (
    <div className="app-header">
      <div className="app-header-nav">
        {crumbs.length > 0 && (
          <>
            <button className="tb-btn tb-back" onPointerDown={triggerHaptic} onClick={goBack}>←</button>
            <div className="tb-divider-v" />
          </>
        )}
        <nav className="toolbar-breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={i} className="tb-crumb-group">
              <button className="tb-crumb" onPointerDown={triggerHaptic} onClick={crumb.onClick}>{crumb.label}</button>
              <span className="tb-crumb-sep">›</span>
            </span>
          ))}
          <span className="tb-crumb tb-crumb-active">{active}</span>
        </nav>
      </div>

      <div className="app-header-brand">
        <img src={logo} alt="TFM" className="app-brand-logo" />
        <span className="app-brand-title">TFM Playbook</span>
      </div>

      <div className="app-header-right">
        {actions}
        {onAdd && (
          <button className="app-header-add-btn" onPointerDown={triggerHaptic} onClick={onAdd}>{addLabel}</button>
        )}
      </div>
    </div>
  );
}
