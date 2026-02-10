// ========================================
// 🚀 NOUVELLES FONCTIONNALITÉS
// Module : Challenge vs Année Dernière
// Date : 2025
// ========================================

console.log('📦 Module Nouveautés chargé !');

// ========== COMPOSANT : IMPORT OBJECTIFS EXCEL ==========

function ImportObjectifs({ onImportComplete }) {
    const [importing, setImporting] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setImporting(true);
        setMessage('📥 Lecture du fichier...');

        try {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Lire la feuille "Production Signée (PNA)"
                    const sheetPNA = workbook.Sheets['Production Signée (PNA)'];
                    const dataPNA = XLSX.utils.sheet_to_json(sheetPNA);

                    // Lire la feuille "Nombre Affaires"
                    const sheetAffaires = workbook.Sheets['Nombre Affaires'];
                    const dataAffaires = XLSX.utils.sheet_to_json(sheetAffaires);

                    setMessage('💾 Enregistrement dans Firebase...');

                    // Préparer les données pour Firebase
                    const objectifs = [];
                    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

                    dataPNA.forEach((rowPNA, idx) => {
                        const rowAffaires = dataAffaires[idx];
                        const commercial = rowPNA.Commercial;

                        mois.forEach((moisNom, moisIdx) => {
                            const pna = rowPNA[moisNom] || 0;
                            const affaires = rowAffaires[moisNom] || 0;

                            if (pna > 0 || affaires > 0) {
                                objectifs.push({
                                    commercial: commercial,
                                    annee: 2025,
                                    mois: moisIdx + 1,
                                    moisNom: moisNom,
                                    productionSignee: Number(pna),
                                    nbAffaires: Number(affaires)
                                });
                            }
                        });
                    });

                    // Supprimer les anciens objectifs 2025
                    const oldObjectifs = await db.collection('objectifs')
                        .where('annee', '==', 2025)
                        .get();
                    
                    const deletePromises = [];
                    oldObjectifs.forEach(doc => {
                        deletePromises.push(doc.ref.delete());
                    });
                    await Promise.all(deletePromises);

                    // Ajouter les nouveaux objectifs
                    const addPromises = objectifs.map(obj => 
                        db.collection('objectifs').add(obj)
                    );
                    await Promise.all(addPromises);

                    setMessage(`✅ ${objectifs.length} objectifs importés avec succès !`);
                    setTimeout(() => {
                        onImportComplete();
                    }, 2000);

                } catch (error) {
                    console.error('Erreur traitement fichier:', error);
                    setMessage('❌ Erreur lors du traitement du fichier');
                }
            };

            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error('Erreur import:', error);
            setMessage('❌ Erreur lors de l\'import');
        }

        setImporting(false);
    };

    return (
        <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                📥 Importer les objectifs depuis Excel
            </h3>
            
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Importez le fichier Excel contenant les objectifs de l'année (Production Signée et Nombre d'Affaires par mois)
            </p>

            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={importing}
                style={{
                    padding: '0.5rem',
                    border: '2px dashed #d1d5db',
                    borderRadius: '0.5rem',
                    width: '100%',
                    cursor: importing ? 'not-allowed' : 'pointer'
                }}
            />

            {message && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: message.includes('✅') ? '#d1fae5' : message.includes('❌') ? '#fee2e2' : '#dbeafe',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}
        </div>
    );
}

// ========== COMPOSANT : CARTE CHALLENGE INDIVIDUEL ==========

function ChallengeCard({ currentUser, ventes, objectifs }) {
    const [currentMonth] = React.useState(new Date().getMonth() + 1);
    const [currentYear] = React.useState(new Date().getFullYear());

    // Calculer les stats actuelles du commercial pour le mois en cours
    const statsActuelles = React.useMemo(() => {
        const ventesCommercial = ventes.filter(v => {
            const date = new Date(v.jourRdv);
            return v.commercial === currentUser.name 
                && date.getMonth() + 1 === currentMonth
                && date.getFullYear() === currentYear;
        });

        return {
            nbAffaires: ventesCommercial.length,
            pna: ventesCommercial.reduce((sum, v) => sum + (parseFloat(v.pna) || 0), 0)
        };
    }, [ventes, currentUser.name, currentMonth, currentYear]);

    // Trouver l'objectif de l'année dernière (même mois)
    const objectifAnneDerniere = React.useMemo(() => {
        const obj = objectifs.find(o => 
            o.commercial.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])
            && o.mois === currentMonth
            && o.annee === currentYear
        );

        return obj || { productionSignee: 0, nbAffaires: 0 };
    }, [objectifs, currentUser.name, currentMonth, currentYear]);

    // Calculer les pourcentages
    const pourcentageAffaires = objectifAnneDerniere.nbAffaires > 0
        ? (statsActuelles.nbAffaires / objectifAnneDerniere.nbAffaires) * 100
        : 0;

    const pourcentagePNA = objectifAnneDerniere.productionSignee > 0
        ? (statsActuelles.pna / objectifAnneDerniere.productionSignee) * 100
        : 0;

    // Déterminer la couleur selon le pourcentage
    const getColor = (percentage) => {
        if (percentage >= 120) return '#06b6d4'; // Bleu (dépassement !)
        if (percentage >= 100) return '#10b981'; // Vert
        if (percentage >= 70) return '#f59e0b';  // Jaune/Orange
        return '#ef4444'; // Rouge
    };

    const colorAffaires = getColor(pourcentageAffaires);
    const colorPNA = getColor(pourcentagePNA);

    const getStatut = () => {
        const avg = (pourcentageAffaires + pourcentagePNA) / 2;
        if (avg >= 120) return { emoji: '🔵', text: 'Dépassement exceptionnel !', color: '#06b6d4' };
        if (avg >= 100) return { emoji: '🟢', text: 'Objectif atteint !', color: '#10b981' };
        if (avg >= 70) return { emoji: '🟡', text: 'En bonne voie', color: '#f59e0b' };
        return { emoji: '🔴', text: 'À intensifier', color: '#ef4444' };
    };

    const statut = getStatut();

    const moisNom = new Date(0, currentMonth - 1).toLocaleDateString('fr-FR', { month: 'long' });

    if (objectifAnneDerniere.nbAffaires === 0 && objectifAnneDerniere.productionSignee === 0) {
        return null; // Pas d'objectif pour ce commercial
    }

    return (
        <div className="card" style={{
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            border: `2px solid ${statut.color}30`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                    🏆 Challenge {moisNom} {currentYear}
                </h3>
                <div style={{
                    padding: '0.5rem 1rem',
                    background: statut.color,
                    color: 'white',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    {statut.emoji} {statut.text}
                </div>
            </div>

            {/* NOMBRE D'AFFAIRES */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        📊 Nombre d'affaires
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: colorAffaires }}>
                        {pourcentageAffaires.toFixed(0)}%
                    </span>
                </div>
                
                <div style={{
                    height: '24px',
                    background: '#e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(pourcentageAffaires, 100)}%`,
                        background: `linear-gradient(90deg, ${colorAffaires}, ${colorAffaires}dd)`,
                        borderRadius: '12px',
                        transition: 'width 1s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                    }}>
                        {pourcentageAffaires >= 15 && `${pourcentageAffaires.toFixed(0)}%`}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>
                        Actuel : <strong style={{ color: '#1f2937' }}>{statsActuelles.nbAffaires}</strong>
                    </span>
                    <span style={{ color: '#6b7280' }}>
                        Objectif : <strong style={{ color: '#1f2937' }}>{objectifAnneDerniere.nbAffaires}</strong>
                    </span>
                </div>

                {pourcentageAffaires < 100 && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: '#fef3c7',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#92400e',
                        textAlign: 'center'
                    }}>
                        ⚡ Encore <strong>{objectifAnneDerniere.nbAffaires - statsActuelles.nbAffaires}</strong> affaires pour égaler l'année dernière !
                    </div>
                )}
            </div>

            {/* PRODUCTION SIGNÉE (PNA) */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                        💰 Production signée (PNA)
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: colorPNA }}>
                        {pourcentagePNA.toFixed(0)}%
                    </span>
                </div>
                
                <div style={{
                    height: '24px',
                    background: '#e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(pourcentagePNA, 100)}%`,
                        background: `linear-gradient(90deg, ${colorPNA}, ${colorPNA}dd)`,
                        borderRadius: '12px',
                        transition: 'width 1s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                    }}>
                        {pourcentagePNA >= 15 && `${pourcentagePNA.toFixed(0)}%`}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>
                        Actuel : <strong style={{ color: '#1f2937' }}>{statsActuelles.pna.toFixed(0)}€</strong>
                    </span>
                    <span style={{ color: '#6b7280' }}>
                        Objectif : <strong style={{ color: '#1f2937' }}>{objectifAnneDerniere.productionSignee.toFixed(0)}€</strong>
                    </span>
                </div>

                {pourcentagePNA < 100 && (
                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: '#fef3c7',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#92400e',
                        textAlign: 'center'
                    }}>
                        ⚡ Encore <strong>{(objectifAnneDerniere.productionSignee - statsActuelles.pna).toFixed(0)}€</strong> pour égaler l'année dernière !
                    </div>
                )}
            </div>
        </div>
    );
}

// ========== COMPOSANT : CLASSEMENT CHALLENGE (Admin) ==========

function ClassementChallenge({ ventes, objectifs, allUsers }) {
    const [currentMonth] = React.useState(new Date().getMonth() + 1);
    const [currentYear] = React.useState(new Date().getFullYear());

    const classement = React.useMemo(() => {
        const commerciaux = Object.values(allUsers).filter(u => u.type === 'commercial');
        
        const scores = commerciaux.map(commercial => {
            // Stats actuelles
            const ventesCommercial = ventes.filter(v => {
                const date = new Date(v.jourRdv);
                return v.commercial === commercial.name 
                    && date.getMonth() + 1 === currentMonth
                    && date.getFullYear() === currentYear;
            });

            const statsActuelles = {
                nbAffaires: ventesCommercial.length,
                pna: ventesCommercial.reduce((sum, v) => sum + (parseFloat(v.pna) || 0), 0)
            };

            // Objectif année dernière
            const objectif = objectifs.find(o => 
                o.commercial.toLowerCase().includes(commercial.name.toLowerCase().split(' ')[0])
                && o.mois === currentMonth
                && o.annee === currentYear
            ) || { productionSignee: 0, nbAffaires: 0 };

            // Calcul des pourcentages
            const pourcentageAffaires = objectif.nbAffaires > 0
                ? (statsActuelles.nbAffaires / objectif.nbAffaires) * 100
                : 0;

            const pourcentagePNA = objectif.productionSignee > 0
                ? (statsActuelles.pna / objectif.productionSignee) * 100
                : 0;

            const moyennePourcentage = (pourcentageAffaires + pourcentagePNA) / 2;

            return {
                commercial: commercial.name,
                statsActuelles,
                objectif,
                pourcentageAffaires,
                pourcentagePNA,
                moyennePourcentage
            };
        });

        // Trier par moyenne de pourcentage
        return scores.sort((a, b) => b.moyennePourcentage - a.moyennePourcentage);
    }, [ventes, objectifs, allUsers, currentMonth, currentYear]);

    const getColor = (percentage) => {
        if (percentage >= 120) return '#06b6d4';
        if (percentage >= 100) return '#10b981';
        if (percentage >= 70) return '#f59e0b';
        return '#ef4444';
    };

    const getMedaille = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `#${index + 1}`;
    };

    const moisNom = new Date(0, currentMonth - 1).toLocaleDateString('fr-FR', { month: 'long' });

    return (
        <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>
                🏅 CLASSEMENT DU MOIS - {moisNom} {currentYear}
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {classement.map((score, idx) => {
                    const color = getColor(score.moyennePourcentage);
                    const isTop3 = idx < 3;

                    return (
                        <div key={score.commercial} style={{
                            padding: '1.5rem',
                            background: isTop3 ? `${color}10` : '#f9fafb',
                            borderRadius: '0.75rem',
                            borderLeft: `4px solid ${color}`,
                            boxShadow: isTop3 ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{
                                    fontSize: isTop3 ? '2rem' : '1.5rem',
                                    marginRight: '1rem',
                                    fontWeight: isTop3 ? 'bold' : 'normal'
                                }}>
                                    {getMedaille(idx)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: '700',
                                        fontSize: isTop3 ? '1.125rem' : '1rem',
                                        color: '#1f2937'
                                    }}>
                                        {score.commercial}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                        Moyenne : {score.moyennePourcentage.toFixed(0)}%
                                    </div>
                                </div>
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    background: color,
                                    color: 'white',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: '700'
                                }}>
                                    {score.moyennePourcentage.toFixed(0)}%
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                                <div>
                                    <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>📊 Affaires</div>
                                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                        {score.statsActuelles.nbAffaires} / {score.objectif.nbAffaires}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: getColor(score.pourcentageAffaires), fontWeight: '600' }}>
                                        {score.pourcentageAffaires.toFixed(0)}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>💰 PNA</div>
                                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                        {score.statsActuelles.pna.toFixed(0)}€ / {score.objectif.productionSignee.toFixed(0)}€
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: getColor(score.pourcentagePNA), fontWeight: '600' }}>
                                        {score.pourcentagePNA.toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ========== EXPORT DES COMPOSANTS ==========
// Les composants sont maintenant disponibles globalement
console.log('✅ Composants Challenge chargés !');
