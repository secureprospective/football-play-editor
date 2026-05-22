import '../Toolbar/Toolbar.css';
import './AppHeader.css';
import useEditorStore from '../../store/useEditorStore';
import { THEME_LOGO } from '../../constants/themeColors';

export default function AppHeader({ crumbs = [], active, onAdd, addLabel, actions }) {
  const { goBack, theme } = useEditorStore();
  const logo = THEME_LOGO[theme] || THEME_LOGO['theme-sun-cyan'];

  return (
    <div className="app-header">
      <div className="app-header-nav">
        {crumbs.length > 0 && (
          <>
            <button className="tb-btn tb-back" onClick={goBack}>←</button>
            <div className="tb-divider-v" />
          </>
        )}
        <nav className="toolbar-breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={i} className="tb-crumb-group">
              <button className="tb-crumb" onClick={crumb.onClick}>{crumb.label}</button>
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
          <button className="tb-btn app-header-add-btn" onClick={onAdd}>{addLabel}</button>
        )}
      </div>
    </div>
  );
}
