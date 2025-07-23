import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit3, User, LogOut, Trash2, Filter, X,
  Home, DollarSign, Plane, GraduationCap, Menu, ChevronLeft
} from 'lucide-react';
import AddStudentModal from './AddStudentModal';
import { v4 as uuidv4 } from 'uuid';


// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };


  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }


  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


export default function MainScreen({ onLogout }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('Academic');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);


  const profileRef = useRef(null);
  const filterRef = useRef(null);
  const LOCAL_KEY = 'localStudents';


  const menuItems = [
    { name: 'Home', icon: Home, path: '/home' },
    { name: 'Finance', icon: DollarSign, path: '/finance' },
    { name: 'Travel', icon: Plane, path: '/travel' },
    { name: 'Academic', icon: GraduationCap, path: '/academic' },
  ];


  const getLocalStudents = () => {
    try {
      const localData = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
      console.log('MainScreen: Fetched local students', localData);
      return localData;
    } catch {
      console.error('MainScreen: Error parsing local students');
      return [];
    }
  };


  const saveLocalStudent = (student) => {
    const localStudents = getLocalStudents();
    localStudents.unshift(student);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localStudents));
    console.log('MainScreen: Saved local student', student);
  };


  const removeLocalStudent = (id) => {
    const localStudents = getLocalStudents();
    const updatedStudents = localStudents.filter((s) => s.id !== id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updatedStudents));
    console.log('MainScreen: Removed local student with id', id);
  };


  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        console.log('MainScreen: Fetching students from API');
        const response = await fetch('https://687b2e57b4bc7cfbda84e292.mockapi.io/users');
        if (!response.ok) throw new Error('Failed to fetch students');
        const data = await response.json();
        const localStudents = getLocalStudents();
        const localIds = new Set(localStudents.map((s) => s.id || s.mail));
        const filteredApi = data.filter((s) => !localIds.has(s.id || s.mail));
        const allStudents = [...localStudents, ...filteredApi];
        const uniqueStudents = Array.from(
          new Map(allStudents.map(student => [student.id ? `${student.id}-${student.mail}` : student.mail, student])).values()
        );
        setStudents(uniqueStudents);
        console.log('MainScreen: Students set', uniqueStudents.map(s => ({ id: s.id, firstname: s.firstname, mail: s.mail })));
      } catch (error) {
        console.error('MainScreen: Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Define filteredStudents and sortedStudents before useEffect
  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    if (filterType === 'all' || filterType === 'firstname') {
      const value = String(s.firstname || '').toLowerCase();
      return value.startsWith(term);
    }
    const value = String(s[filterType] || '').toLowerCase();
    return value.includes(term);
  });


  const sortedStudents = searchTerm ? sortStudents(filteredStudents) : filteredStudents;


  useEffect(() => {
    console.log('MainScreen: Search term changed to', searchTerm, 'filteredStudents:', filteredStudents.map(s => s.firstname), 'sortedStudents:', sortedStudents.map(s => s.firstname));
  }, [searchTerm, filteredStudents, sortedStudents]);


  const handleLogout = () => {
    console.log('MainScreen: Logging out');
    sessionStorage.removeItem('isLoggedIn');
    onLogout();
  };


  const sortStudents = (studentsToSort) => {
    return [...studentsToSort].sort((a, b) => {
      const valueA = String(a.firstname || '').toLowerCase();
      const valueB = String(b.firstname || '').toLowerCase();
      return valueA.localeCompare(valueB, undefined, { sensitivity: 'base' });
    });
  };


  const handleSearchChange = (e) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    setCurrentPage(1);
  };


  const handleAddStudent = async (newStudent) => {
    try {
      console.log('MainScreen: Adding student', newStudent);
      const response = await fetch('https://687b2e57b4bc7cfbda84e292.mockapi.io/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      if (!response.ok) throw new Error('Failed to add student');
      const addedStudent = await response.json();
      saveLocalStudent(addedStudent);
      setStudents((prev) => {
        const updated = [addedStudent, ...prev];
        return Array.from(new Map(updated.map(student => [student.id ? `${student.id}-${student.mail}` : student.mail, student])).values());
      });
      // Reset pagination and search to ensure new student is visible
      setCurrentPage(1);
      setSearchTerm('');
      console.log('MainScreen: Student added successfully', addedStudent);
    } catch (error) {
      console.error('MainScreen: Error adding student:', error);
    }
  };


  const handleEditStudent = (student) => {
    console.log('MainScreen: Editing student', student);
    setCurrentStudent({ ...student });
    setEditModalOpen(true);
  };


  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      console.log('MainScreen: Deleting student with id', id);
      const response = await fetch(`https://687b2e57b4bc7cfbda84e292.mockapi.io/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('MainScreen: Student with id', id, 'not found on server, removing from local state');
          setStudents((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            return Array.from(new Map(updated.map(student => [student.id ? `${student.id}-${student.mail}` : student.mail, student])).values());
          });
          removeLocalStudent(id); // Sync localStorage with 404 case
        } else {
          throw new Error('Delete failed');
        }
      } else {
        setStudents((prev) => {
          const updated = prev.filter((s) => s.id !== id);
          return Array.from(new Map(updated.map(student => [student.id ? `${student.id}-${student.mail}` : student.mail, student])).values());
        });
        removeLocalStudent(id); // Sync localStorage with successful delete
        console.log('MainScreen: Student deleted successfully', id);
      }
    } catch (error) {
      console.error('MainScreen: Error deleting student:', error);
    }
  };


  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      console.log('MainScreen: Updating student', currentStudent);
      const response = await fetch(
        `https://687b2e57b4bc7cfbda84e292.mockapi.io/users/${currentStudent.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentStudent),
        }
      );
      if (!response.ok) throw new Error('Update failed');
      const updatedStudent = await response.json();
      setStudents((prev) => {
        const updated = prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
        return Array.from(new Map(updated.map(student => [student.id ? `${student.id}-${student.mail}` : student.mail, student])).values());
      });
      setEditModalOpen(false);
      setCurrentStudent(null);
      console.log('MainScreen: Student updated successfully', updatedStudent);
    } catch (error) {
      console.error('MainScreen: Error updating student:', error);
    }
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentStudent((prev) => ({ ...prev, [name]: value }));
  };


  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'age', label: 'Age' },
    { key: 'role', label: 'Role' },
  ];


  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';


  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedStudents.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedStudents.length / rowsPerPage);


  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };


  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };


  console.log('MainScreen: Rendering with students', students.map(s => ({ id: s.id, firstname: s.firstname, mail: s.mail })), 'sortedStudents', sortedStudents.map(s => ({ id: s.id, firstname: s.firstname, mail: s.mail })), 'searchTerm', searchTerm);


  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50">
        <aside className={`${sidebarWidth} bg-gray-900 text-white flex-shrink-0 transition-all duration-300 ease-in-out relative`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-lg">MyApp</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Toggle Sidebar"
            >
              {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>


          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenuItem === item.name;


                return (
                  <li key={item.name}>
                    <button
                      onClick={() => setActiveMenuItem(item.name)}
                      className={`w-full flex items-center space-x-2 px-1 py-2 rounded-lg transition-colors duration-200 text-left
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>


          <div className="p-4 border-t border-gray-700">
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <User size={16} />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">John Doe</p>
                  <p className="text-xs text-gray-400 truncate">john@example.com</p>
                </div>
              )}
            </div>
          </div>
        </aside>


        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white shadow-sm border-b flex justify-between items-center px-6 h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Students Dashboard</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {activeMenuItem}
              </span>
            </div>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <User size={20} className="text-gray-600" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white shadow-lg border rounded-xl py-2 z-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full gap-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </header>


          <div className="px-6 py-4 bg-white border-b shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex items-center md:w-auto w-full">
                <div className="relative md:w-80 w-full">
                  <Search className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder={`Search students${filterType !== 'all' ? ` by ${filterType}` : ''}...`}
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="relative ml-2" ref={filterRef}>
                  <button
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    <Filter size={16} />
                    {!sidebarCollapsed && <span className="hidden sm:inline">Filter</span>}
                  </button>
                  {filterDropdownOpen && (
                    <div className="absolute top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      {filterOptions.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setFilterType(key);
                            setFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                            ${filterType === key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
                          `}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>


              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 shadow-sm text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add Student
              </button>
            </div>
          </div>


          <main className="flex-1 p-6 overflow-x-auto">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-4 text-left font-semibold text-gray-700">First Name</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Last Name</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Age</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Phone</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Email</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Role</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Date</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center p-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-gray-500">Loading students...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center p-8 text-gray-500">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((student, index) => (
                      <tr
                        key={`${student.id || student.mail}-${uuidv4()}`}
                        className={`border-t border-gray-100 hover:bg-blue-50/50 transition-colors
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                        `}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4 text-gray-900 font-medium">{student.firstname || ''}</td>
                        <td className="p-4 text-gray-900">{student.lastname || ''}</td>
                        <td className="p-4 text-gray-700">{student.age || ''}</td>
                        <td className="p-4 text-gray-700">{student.phone || ''}</td>
                        <td className="p-4 text-gray-700">{student.mail || ''}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            {student.role || ''}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700">
                          {student.date ? new Date(student.date).toLocaleDateString() : ''}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditStudent(student)}
                              title="Edit Student"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              title="Delete Student"
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>


            {!loading && sortedStudents.length > 0 && (
              <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-gray-200">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>


        {editModalOpen && currentStudent && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Edit Student</h3>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <form onSubmit={handleUpdateStudent} className="space-y-4">
                  {['firstname', 'lastname', 'age', 'phone', 'mail', 'role'].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {field === 'mail' ? 'Email' : field.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input
                        name={field}
                        type={field === 'age' ? 'number' : field === 'mail' ? 'email' : 'text'}
                        value={currentStudent[field] || ''}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  ))}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditModalOpen(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}


        <AddStudentModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddStudent={handleAddStudent}
        />
      </div>
    </ErrorBoundary>
  );
}

