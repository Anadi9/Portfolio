import React from 'react';
import Profilepic from '../Images/Profilepic';
import Home from '../Contents/Home';

function HomeTable(props) {
    return (
        <div>
        <table className="table">
          <tbody>
          <tr>
            <td className="w-75"><Home/></td>
            <td className="w-75"><Profilepic/></td>
          </tr>
          </tbody>
        </table>
        </div>
    );
}

export default HomeTable;