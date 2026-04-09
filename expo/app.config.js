/**
 * Extends merged app.json config; strips invalid EAS Update signing paths only.
 */
module.exports = ({ config }) => {
  const expo = { ...config };

  if (expo.updates && typeof expo.updates === "object") {
    const next = { ...expo.updates };
    delete next.codeSigningCertificate;
    delete next.codeSigningMetadata;

    if (Object.keys(next).length > 0) {
      expo.updates = next;
    } else {
      delete expo.updates;
    }
  }

  return expo; // IMPORTANT: do NOT wrap inside { expo }
};
