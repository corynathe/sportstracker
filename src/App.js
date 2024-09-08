import React, { useState, useEffect, useCallback, useRef } from 'react';
import Airtable from 'airtable';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faHouseUser, faBasketball, faLock, faUserGear } from '@fortawesome/free-solid-svg-icons';

const baseKey = 'appSRWIF4S6lcC2In';
const apiKey = 'patLKf7QPBQgbLGlG.2859a28a0477c42ad5d58d08daad84a494ebc11bca761441b70051ab5d74867b';
const base = new Airtable({ apiKey: apiKey }).base(baseKey);

function App() {
  const inputRefs = useRef([]);

  const [allPlayers, setAllPlayers] = useState();
  const [playerId, setPlayerId] = useState();
  const [playerRecord, setPlayerRecord] = useState();
  const [playerData, setPlayerData] = useState();

  const [shotCount, setShotCount] = useState(0);
  const [recordId, setRecordId] = useState();
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passcodeMatch, setPasscodeMatch] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [changePasscode, setChangePasscode] = useState(false);
  const showPasscodeInput = (playerRecord && !passcodeMatch) || changePasscode;
  const percentDone = playerRecord ? Math.round(playerRecord.fields['Total'] / playerRecord.fields['Goal'] * 100) : undefined;

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
          const _hasPasscode = record.fields['Passcode'] !== undefined;
          setHasPasscode(_hasPasscode);
          if (!_hasPasscode) setPasscodeMatch(true);
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
        setPasscodeMatch(false);
        setChangePasscode(false);
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

  const handleChange = useCallback((e, index) => {
    const value = e.target.value;

    // If the current input has a value and it's a digit, move focus to the next input
    if (value.length === 1 && /\d/.test(value) && index < 3) {
      inputRefs.current[index + 1].focus();
    }

    // If the last input is filled, call onComplete with the passcode
    if (!changePasscode && index === 3 && value.length === 1) {
      const passcode = inputRefs.current.map(input => input.value).join('');
      try {
        const intCode = parseInt(passcode);
        if (intCode === playerRecord.fields['Passcode']) {
            setPasscodeMatch(true);
        }
      } catch(error) {}
    }
  }, [playerRecord, changePasscode]);

  const handleKeyDown = useCallback((e, index) => {
    // Allow backspace to move focus back
    if (e.key === 'Backspace' && index > 0 && !e.target.value) {
      inputRefs.current[index - 1].focus();
    }
  }, []);

  const onChangePasscode = useCallback(() => {
    setChangePasscode(current => !current);
  }, []);

  const onResetPasscode = useCallback(() => {
    const values = inputRefs.current.filter(input => input.value.length > 0).map(input => input.value);
    if (values.length < 4) return;
    const passcode = values.join('');
    try {
      const intCode = parseInt(passcode);
      base('Player').update([
        {
          "id": playerId,
          "fields": {
            "Passcode": intCode
          }
        }
      ], function(err, records) {
        if (err) {
          console.error(err);
          return;
        }
        setPlayerRecord(records[0]);
        setChangePasscode(false);
      });
    } catch(error) {}
  }, [playerId]);

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
            <div className="mt-12">
                <a href='#' onClick={onReturnHome}>
                    <FontAwesomeIcon icon={faHouseUser} size='lg' />
                </a>
                {passcodeMatch && (
                    <a href='#' onClick={onChangePasscode} style={{float: 'right'}}>
                        <FontAwesomeIcon icon={faUserGear} size='lg' />
                    </a>
                )}
                <h1 className="text-center">{playerRecord?.fields['Name']}</h1>
            </div>
        )}

        {changePasscode && playerRecord?.fields['Passcode'] !== undefined && (
            <div className="text-center">
                Passcode: {String(playerRecord?.fields['Passcode']).padStart(4, '0')}
            </div>
        )}

        {showPasscodeInput && (
            <div className="text-center mt-4 passcode-input">
              {[0, 1, 2, 3].map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  ref={el => inputRefs.current[index] = el}
                  onChange={e => handleChange(e, index)}
                  onKeyDown={e => handleKeyDown(e, index)}
                  className="passcode-digit"
                />
              ))}
            </div>
        )}

        {changePasscode && (
          <div className="text-center mt-4">
            <button className="btn btn-dark" onClick={onResetPasscode}>Set Passcode</button>
          </div>
        )}

      {playerRecord && !showPasscodeInput && (
        <>
            <div className="text-center mt-4" style={{color: 'maroon'}}>
              <FontAwesomeIcon icon={faBasketball} size='2x' style={{paddingRight: '20px', color: 'maroon'}}/>
              <span style={{fontSize: 30, fontWeight: 'bold'}}>{playerRecord?.fields['Total'].toLocaleString()}</span>
              <span style={{color: 'black'}}> of {playerRecord?.fields['Goal'].toLocaleString()}</span>
              <FontAwesomeIcon icon={faBasketball} size='2x' style={{paddingLeft: '20px', color: 'maroon'}}/>
            </div>
            {percentDone !== undefined && (
                <div className="mx-auto mt-2" style={{width: '50%'}}>
                    <div className="progress">
                      <div className="progress-bar" role="progressbar" aria-valuenow={percentDone} aria-valuemin="0" aria-valuemax="100" style={{width: percentDone + '%'}}>
                        {percentDone}%
                      </div>
                    </div>
                </div>
            )}
            {!recordId && (
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
        </>
      )}
    </div>
  );
}

export default App;
