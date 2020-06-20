import React from 'react';

function Education(props) {
    return (
        <div className="col s12 m8 l9">
          <h1 className="text-success">Education</h1><br/><br/>
          <div>
          <table className="table table-sm">
            <thead className="thead-light">
               <tr>
                 <th scope="col">Degree</th>
                 <th scope="col">Institute</th>
                 <th scope="col">Session</th>
               </tr>
            </thead>
            <tbody>
            <tr>
            <td className="text-white">Bachelor in Computer Application</td>
            <td className="text-white">Graphic Era University</td>
            <td className="text-white">2019-22</td>
          </tr>
          <tr>
            <td className="text-white">XII Standard</td>
            <td className="text-white">M.M. Public School</td>
            <td className="text-white">2017-18</td>
          </tr>
            </tbody>
          </table>
          </div>
        </div>
    );
}

export default Education;