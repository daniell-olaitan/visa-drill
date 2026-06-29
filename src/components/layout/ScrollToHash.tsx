import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the element matching `location.hash` whenever the route or hash
 * changes. Falls back to scrolling to the top when there's no hash.
 *
 * React Router v6 does not handle hash-link scrolling automatically, so we do
 * it here. Using requestAnimationFrame ensures the target element exists in
 * the DOM by the time we try to scroll.
 */
const ScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [hash, pathname]);

  return null;
};

export default ScrollToHash;
