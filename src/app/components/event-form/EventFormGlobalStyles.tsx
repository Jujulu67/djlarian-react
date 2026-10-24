export function EventFormGlobalStyles() {
  return (
    <style jsx global>{`
      input[type='datetime-local'] {
        position: relative;
        padding-right: 2.5rem;
        cursor: pointer;
        color-scheme: dark;
        min-width: 100%;
        width: 100%;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
      }

      input[type='datetime-local']::-webkit-calendar-picker-indicator {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        filter: invert(0.8) brightness(0.8) sepia(0.3) saturate(3) hue-rotate(234deg);
        opacity: 0.7;
        cursor: pointer;
        width: 1.25rem;
        height: 1.25rem;
        z-index: 2;
      }

      input[type='datetime-local']::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
      }

      @supports (-moz-appearance: none) {
        input[type='datetime-local'] {
          min-width: 100%;
          width: 100%;
        }
      }

      /* Amélioration de l'espacement général */
      .form-grid {
        display: grid;
        grid-gap: 1.5rem;
      }

      .input-group {
        margin-bottom: 1.5rem;
      }

      .image-upload-container {
        border-radius: 0.5rem;
        transition: all 0.2s ease;
      }

      /* Rendre le champ de date plus visible comme un bouton */
      input[type='datetime-local'] {
        background-image: none;
        padding-left: 1rem;
      }

      /* Ajouter un wrapper pour le champ de date */
      .datetime-field {
        position: relative;
        width: 100%;
      }

      .datetime-field::before {
        content: '';
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.25rem;
        height: 1.25rem;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        pointer-events: none;
        z-index: 1;
      }

      input[type='datetime-local'] {
        padding-left: 2.5rem;
      }
    `}</style>
  );
}
