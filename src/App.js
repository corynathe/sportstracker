import React, { useState, useEffect, useCallback } from 'react';
import Airtable from 'airtable';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faHouseUser, faBasketball } from '@fortawesome/free-solid-svg-icons';

const baseKey = 'appSRWIF4S6lcC2In';
const apiKey = 'patLKf7QPBQgbLGlG.2859a28a0477c42ad5d58d08daad84a494ebc11bca761441b70051ab5d74867b';
const base = new Airtable({ apiKey: apiKey }).base(baseKey);

function App() {
  const [allPlayers, setAllPlayers] = useState();
  const [playerId, setPlayerId] = useState(); //'recS87rS8NuHruZq5'
  const [playerRecord, setPlayerRecord] = useState();
  const [playerData, setPlayerData] = useState();

  const [shotCount, setShotCount] = useState(0);
  const [recordId, setRecordId] = useState();
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    base('Player').select({
        view: 'Grid view'
    }).firstPage(function(err, records) {
        if (err) { console.error(err); return; }
        setAllPlayers(records);
        setLoading(false);
    });
  }, []);

  const handlePlayerClick = useCallback((evt) => {
    const dataKey = evt.target.getAttribute('data-key');
    setPlayerId(dataKey);
  }, []);

  const loadPlayerRecord = useCallback((id) => {
    setLoading(true);
      base('Player').find(id, function(err, record) {
          if (err) { console.error(err); return; }
          setPlayerRecord(record);
          setLoading(false);
      });
  }, []);

  const loadPlayerData = useCallback((playerName) => {
    base('Data').select({
        filterByFormula: "FIND('" + playerName + "', {Player} & '')",
        maxRecords: 5,
        view: "Grid view",
        sort: [{field: "DateTime", direction: "desc"}],
    }).firstPage(function(err, records) {
        setPlayerData(records);
    });
  }, []);

    useEffect(() => {
        setPlayerRecord(undefined);
        if (!playerId) return;
        loadPlayerRecord(playerId);
    }, [playerId]);

    useEffect(() => {
        if (!playerRecord) return;
        setPlayerData(undefined);
        loadPlayerData(playerRecord.fields['Name']);
    }, [playerRecord]);

    const onReturnHome = useCallback(() => {
        setPlayerId(undefined);
        setPlayerRecord(undefined);
        setPlayerData(undefined);
    }, []);

    const handleStart = useCallback(() => {
        if (recordId) {
          alert("Tracking already started!");
          return;
        }

        setShotCount(0);
        base('Data').create([
          {
            "fields": {
              "Player": [playerId],
              "Value": 0
            }
          }
        ], function(err, records) {
          if (err) {
            console.error(err);
            return;
          }
          setRecordId(records[0].id);
        });
    }, [playerId, recordId]);

    const handleIncrement1 = useCallback(() => {
        setShotCount(prev => prev + 1);
        setHasChanges(true);
    }, []);

    const handleIncrement5 = useCallback(() => {
        setShotCount(prev => prev + 5);
        setHasChanges(true);
    }, []);

    const handleIncrement10 = useCallback(() => {
        setShotCount(prev => prev + 10);
        setHasChanges(true);
    }, []);

    const handleReset = useCallback(() => {
        setShotCount(0);
        setHasChanges(true);
    }, []);

    useEffect(() => {
        if (hasChanges) {
            base('Data').update([
              {
                "id": recordId,
                "fields": {
                  "Value": shotCount
                }
              }
            ], function(err, records) {
              if (err) {
                console.error(err);
                return;
              }
            });
        }
        setHasChanges(false);
    }, [hasChanges, shotCount, recordId]);

    const handleDone = useCallback(() => {
        setRecordId(undefined);
        setShotCount(0);
        loadPlayerRecord(playerId);
        loadPlayerData(playerRecord.fields['Name']);
    }, [playerId, playerRecord]);

  return (
    <div className="container mt-5">
        {loading && (
            <div className="text-center mt-4">
                <FontAwesomeIcon icon={faSpinner} pulse size='3x' />
            </div>
        )}

        {!playerId && allPlayers && (
            <div className="text-center mt-4">
                <h1 className="text-center">Select Player</h1>
                <ul className="list-group">
                    {allPlayers.map(player => (
                        <a key={player.id} data-key={player.id} href="#" className="list-group-item list-group-item-action" onClick={handlePlayerClick}>
                            {player.fields['Name']}
                        </a>
                    ))}
                </ul>
            </div>
        )}

      {playerRecord && (
        <>
            <a href='#' onClick={onReturnHome}>
                <FontAwesomeIcon icon={faHouseUser} /> Return Home
            </a>
            <h1 className="text-center">{playerRecord?.fields['Name']}</h1>
            <div className="text-center mt-4" style={{color: 'maroon'}}>
              <FontAwesomeIcon icon={faBasketball} size='2x' style={{paddingRight: '20px', color: 'maroon'}}/>
              <span style={{fontSize: 30, fontWeight: 'bold'}}>{playerRecord?.fields['Total'].toLocaleString()}</span>
              <span style={{color: 'black'}}> of {playerRecord?.fields['Goal'].toLocaleString()}</span>
              <FontAwesomeIcon icon={faBasketball} size='2x' style={{paddingLeft: '20px', color: 'maroon'}}/>
            </div>
        </>
      )}

      {playerRecord && !recordId && (
        <div className="text-center mt-4">
          <button className="btn btn-dark" onClick={handleStart}>Start</button>
        </div>
      )}
      {recordId && (
        <>
            <div className="mt-4 d-flex justify-content-center align-items-center">
              <input type="number" className="form-control w-25 text-center" value={shotCount} readOnly />
            </div>
            <div className="mt-4 d-flex justify-content-center align-items-center">
              <button className="btn btn-secondary mx-2" onClick={handleReset}>Reset</button>
              <button className="btn btn-success mx-2" onClick={handleIncrement1}>+1</button>
              <button className="btn btn-success mx-2" onClick={handleIncrement5}>+5</button>
              <button className="btn btn-success mx-2" onClick={handleIncrement10}>+10</button>
            </div>
        </>
      )}
    {recordId && (
      <div className="text-center mt-4">
        <button className="btn btn-dark" onClick={handleDone}>Done</button>
      </div>
    )}
    {playerData && (
      <div className="text-center mt-4" style={{paddingTop: '50px'}}>
        <div style={{fontSize: 24}}>Latest entries:</div>
        {playerData?.map(row => (
            <div key={row.id}>
                <span>{new Date(row.fields['DateTime']).toLocaleDateString()}</span>
                <span> - </span>
                <span>{row.fields['Value']}</span>
            </div>
        ))}
      </div>
    )}
    </div>
  );
}

export default App;
