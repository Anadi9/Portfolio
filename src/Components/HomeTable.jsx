import React from 'react';
import Profilepic from '../Images/Profilepic';
import Home from '../Contents/Home';

function HomeTable(props) {
    return (
        <div>
        <table className="table">
          <tbody>
          <tr>
            <td><Home/></td>
            <td><Profilepic/></td>
          </tr>
          </tbody>
        </table>
        </div>
    );
}

export default HomeTable;