import sys
import os
import subprocess

def run_robot_suite(target="rpa"):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    rf_dir = os.path.join(base_dir, "robot_framework")
    results_dir = os.path.join(rf_dir, "results")
    
    os.makedirs(results_dir, exist_ok=True)
    
    if target == "api":
        suite_file = os.path.join(rf_dir, "api_tests.robot")
        print("[ROBOT] Running Robot Framework API Automated Tests...")
    else:
        suite_file = os.path.join(rf_dir, "rpa_tasks.robot")
        print("[ROBOT] Running Robot Framework RPA Automation Tasks...")
        
    cmd = [
        sys.executable, "-m", "robot",
        "--outputdir", results_dir,
        suite_file
    ]
    
    result = subprocess.run(cmd, cwd=base_dir)
    
    print("\n" + "="*60)
    print("[RESULTS] ROBOT FRAMEWORK EXECUTION SUMMARY")
    print(f"Directory: {results_dir}")
    print(f"Log HTML: {os.path.join(results_dir, 'log.html')}")
    print(f"Report HTML: {os.path.join(results_dir, 'report.html')}")
    print("="*60 + "\n")
    
    sys.exit(result.returncode)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "rpa"
    run_robot_suite(target)
