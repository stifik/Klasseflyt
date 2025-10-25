'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { getThemeGradient } from '@/lib/themes';
import type { Theme, UserThemePreference } from '@/lib/types';
import './themes.css';

type ThemeWithStatus = Theme & {
  isActive: boolean;
};

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeWithStatus[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeName, setThemeName] = useState('');
  const [colors, setColors] = useState<string[]>(['#667eea', '#764ba2', '#f093fb']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setIsLoading(true);
    try {
      const allThemes = await db.themes.toArray();
      const prefs = await db.userThemePreferences.toArray();
      
      const prefsMap = new Map<number, boolean>();
      prefs.forEach(p => prefsMap.set(p.themeId, p.isActive));

      const themesWithStatus: ThemeWithStatus[] = allThemes.map(theme => ({
        ...theme,
        isActive: prefsMap.get(theme.id!) ?? true,
      }));

      setThemes(themesWithStatus);
    } catch (error) {
      console.error('Error loading themes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleThemeActive = async (themeId: number, currentStatus: boolean) => {
    try {
      // Find existing preference
      const existingPref = await db.userThemePreferences.where('themeId').equals(themeId).first();

      if (existingPref) {
        // Update existing
        await db.userThemePreferences.update(existingPref.id!, {
          isActive: !currentStatus,
        });
      } else {
        // Create new preference
        await db.userThemePreferences.add({
          themeId,
          isActive: !currentStatus,
        });
      }

      loadThemes();
    } catch (error) {
      console.error('Error toggling theme:', error);
      alert('Feil ved aktivering/deaktivering av tema');
    }
  };

  const openCreateModal = () => {
    setEditingTheme(null);
    setThemeName('');
    setColors(['#667eea', '#764ba2', '#f093fb']);
    setShowModal(true);
  };

  const openEditModal = (theme: Theme) => {
    setEditingTheme(theme);
    setThemeName(theme.name);
    setColors([...theme.colors]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTheme(null);
    setThemeName('');
    setColors(['#667eea', '#764ba2', '#f093fb']);
  };

  const saveTheme = async () => {
    if (!themeName.trim()) {
      alert('Vennligst skriv inn et navn på temaet');
      return;
    }

    if (colors.length < 2 || colors.length > 4) {
      alert('Temaet må ha mellom 2 og 4 farger');
      return;
    }

    try {
      if (editingTheme) {
        // Update existing custom theme
        await db.themes.update(editingTheme.id!, {
          name: themeName,
          colors: [...colors],
        });
      } else {
        // Create new custom theme
        const themeId = await db.themes.add({
          name: themeName,
          type: 'custom',
          colors: [...colors],
          isSystem: false,
          createdAt: new Date(),
        });

        // Automatically activate
        await db.userThemePreferences.add({
          themeId: themeId as number,
          isActive: true,
        });
      }

      closeModal();
      loadThemes();
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('Feil ved lagring av tema');
    }
  };

  const deleteTheme = async (themeId: number) => {
    if (!confirm('Er du sikker på at du vil slette dette temaet?')) {
      return;
    }

    try {
      await db.themes.delete(themeId);
      // Cascade delete will handle userThemePreferences and themeHistory
      loadThemes();
    } catch (error) {
      console.error('Error deleting theme:', error);
      alert('Feil ved sletting av tema');
    }
  };

  const previewTheme = (theme: Theme) => {
    const gradient = getThemeGradient(theme);
    
    const overlay = document.createElement('div');
    overlay.className = 'theme-preview-overlay';
    overlay.style.background = gradient;
    overlay.style.backgroundSize = '400% 400%';
    
    overlay.innerHTML = `
      <div class="preview-content">
        <h1>${theme.name}</h1>
        <p>Klikk hvor som helst for å lukke</p>
      </div>
    `;
    
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
  };

  const addColor = () => {
    if (colors.length >= 4) {
      alert('Maksimalt 4 farger');
      return;
    }
    setColors([...colors, '#ffffff']);
  };

  const removeColor = () => {
    if (colors.length <= 2) {
      alert('Minimum 2 farger');
      return;
    }
    setColors(colors.slice(0, -1));
  };

  const updateColor = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
  };

  const predefinedThemes = themes.filter(t => t.isSystem);
  const customThemes = themes.filter(t => !t.isSystem);

  if (isLoading) {
    return <div className="settings-page">Laster temaer...</div>;
  }

  return (
    <div className="settings-page themes-page">
      <h1>Temaer og bakgrunner</h1>
      <p className="subtitle">Administrer bakgrunnsfarger for Morning Display. Systemet bytter automatisk tema hver dag.</p>

      {/* Predefined themes */}
      <section className="theme-section">
        <h2>Tilgjengelige temaer</h2>
        <p className="info-text">Aktiver temaer som kan velges i rotasjonen. Deaktiverte temaer vil ikke bli brukt.</p>
        
        <div className="theme-grid">
          {predefinedThemes.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.isActive}
              onToggle={() => toggleThemeActive(theme.id!, theme.isActive)}
              onPreview={() => previewTheme(theme)}
            />
          ))}
        </div>
      </section>

      {/* Custom themes */}
      <section className="theme-section">
        <div className="section-header">
          <h2>Dine egendefinerte temaer</h2>
          <button className="create-theme-btn" onClick={openCreateModal}>
            + Opprett nytt tema
          </button>
        </div>

        {customThemes.length > 0 ? (
          <div className="theme-grid">
            {customThemes.map(theme => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={theme.isActive}
                onToggle={() => toggleThemeActive(theme.id!, theme.isActive)}
                onPreview={() => previewTheme(theme)}
                onEdit={() => openEditModal(theme)}
                onDelete={() => deleteTheme(theme.id!)}
              />
            ))}
          </div>
        ) : (
          <p className="info-text">Du har ikke opprettet noen egendefinerte temaer enda.</p>
        )}
      </section>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTheme ? 'Rediger tema' : 'Opprett nytt tema'}</h3>

            <div className="form-group">
              <label>Navn på tema:</label>
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="F.eks. 'Mitt vinter-tema'"
              />
            </div>

            <div className="form-group">
              <label>Velg farger (2-4 farger):</label>
              <div className="color-picker-group">
                {colors.map((color, index) => (
                  <input
                    key={index}
                    type="color"
                    className="color-picker"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                  />
                ))}
                <button onClick={addColor} className="color-action-btn">+ Legg til</button>
                <button onClick={removeColor} className="color-action-btn">- Fjern</button>
              </div>
            </div>

            <div className="form-group">
              <label>Forhåndsvisning:</label>
              <div
                className="theme-preview-box"
                style={{
                  background: `linear-gradient(45deg, ${[...colors, colors[0]].join(', ')})`,
                  backgroundSize: '400% 400%',
                }}
              />
            </div>

            <div className="modal-actions">
              <button onClick={saveTheme} className="save-btn">
                {editingTheme ? 'Oppdater tema' : 'Lagre tema'}
              </button>
              <button onClick={closeModal} className="cancel-btn">
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ThemeCardProps = {
  theme: Theme;
  isActive: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function ThemeCard({ theme, isActive, onToggle, onPreview, onEdit, onDelete }: ThemeCardProps) {
  const gradient = getThemeGradient(theme);

  return (
    <div className={`theme-card ${isActive ? 'active' : 'inactive'}`} onClick={onToggle}>
      <div
        className="theme-card-preview"
        style={{
          background: gradient,
          backgroundSize: '400% 400%',
        }}
      >
        <span className={`theme-status ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>
      <div className="theme-card-info">
        <div className="theme-card-name">{theme.name}</div>
        <div className="theme-card-actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={onPreview} className="theme-action-btn preview-btn">
            👁️ Vis
          </button>
          {onEdit && (
            <button onClick={onEdit} className="theme-action-btn edit-btn">
              ✏️ Rediger
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="theme-action-btn delete-btn">
              🗑️ Slett
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
