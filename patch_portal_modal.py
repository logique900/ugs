import re

with open('src/components/ProjectPortal.tsx', 'r') as f:
    content = f.read()

# 1. Remove the old modal (from line 612 to 755)
# It starts with "      {/* Project Details Modal */}" and ends before "      {/* Edit/Add Project Modal */}"

old_modal = re.search(r'      {/\* Project Details Modal \*/}.*?(?=      {/\* Edit/Add Project Modal \*/})', content, re.DOTALL)
if old_modal:
    content = content.replace(old_modal.group(0), "")
else:
    print("Could not find old modal")

# 2. Add the AdminProjectDetails wrapper in the main content area
main_content_start = """          <div className="w-full h-full">
            {portalView === 'overview' && <AdminOverview onSelectProject={onSelectProject} projets={projets} />}"""

main_content_new = """          <div className="w-full h-full">
            {selectedProjectModal ? (
              <AdminProjectDetails 
                projet={selectedProjectModal} 
                onClose={() => setSelectedProjectModal(null)} 
                onAccessWorkspace={() => {
                  const id = selectedProjectModal.id;
                  setSelectedProjectModal(null);
                  onSelectProject(id);
                }}
                ventes={mockVentes}
                achats={mockAchats}
                articles={mockArticles}
                clients={mockClients}
                utilisateurs={mockUsers}
              />
            ) : (
              <>
                {portalView === 'overview' && <AdminOverview onSelectProject={onSelectProject} projets={projets} />}"""

if main_content_start in content:
    content = content.replace(main_content_start, main_content_new)
else:
    print("Could not find main content start")

# Close the fragment we just opened
main_content_end = """        </main>"""

main_content_end_new = """              </>
            )}
          </div>
        </main>"""

# Wait, `ProjectPortal.tsx` has:
#           </div>
#         </main>
# We need to insert `</>` before `</div>`
end_div_main = """          </div>
        </main>"""
if end_div_main in content:
    content = content.replace(end_div_main, main_content_end_new)
else:
    print("Could not find end of main content")


with open('src/components/ProjectPortal.tsx', 'w') as f:
    f.write(content)

